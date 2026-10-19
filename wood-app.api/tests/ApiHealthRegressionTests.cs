using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using brandpulse.api.Controllers.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class ApiHealthRegressionTests
    {
        private class FailingDatabaseCreator : IDatabaseCreator
        {
            public bool EnsureDeleted() => true;
            public Task<bool> EnsureDeletedAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
            public bool EnsureCreated() => true;
            public Task<bool> EnsureCreatedAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
            public bool CanConnect() => false;
            public Task<bool> CanConnectAsync(CancellationToken cancellationToken = default) => Task.FromResult(false);
        }

        private class ThrowingDatabaseCreator : IDatabaseCreator
        {
            public bool EnsureDeleted() => true;
            public Task<bool> EnsureDeletedAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
            public bool EnsureCreated() => true;
            public Task<bool> EnsureCreatedAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
            public bool CanConnect() => throw new InvalidOperationException("Simulated connection failure with sensitive secret in exception: ConnStr=secret;");
            public Task<bool> CanConnectAsync(CancellationToken cancellationToken = default) =>
                Task.FromException<bool>(new InvalidOperationException("Simulated connection failure with sensitive secret in exception: ConnStr=secret;"));
        }

        private WoodAppContext CreateInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new WoodAppContext(options);
        }

        private WoodAppContext CreateFailingContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .ReplaceService<IDatabaseCreator, FailingDatabaseCreator>()
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new WoodAppContext(options);
        }

        private WoodAppContext CreateThrowingContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .ReplaceService<IDatabaseCreator, ThrowingDatabaseCreator>()
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new WoodAppContext(options);
        }

        [Fact]
        public async Task GetHealthCheck_WhenDatabaseIsConnected_ReturnsHttp200WithMinimalFields()
        {
            // Arrange
            var dbName = "HealthCheck_Success_" + Guid.NewGuid();
            using var context = CreateInMemoryContext(dbName);

            // Populate users to ensure that even with existing users in database, NONE are returned
            context.AppUsers.Add(new AppUser
            {
                Id = 1,
                Login = "test_admin",
                Email = "admin@example.com",
                PasswordHash = new byte[] { 1, 2, 3 },
                PasswordSalt = new byte[] { 4, 5, 6 },
                PasswordResetToken = "LEAK_TOKEN_123"
            });
            await context.SaveChangesAsync();

            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<ApiHealthController>>();
            var controller = new ApiHealthController(context, configMock.Object, loggerMock.Object);

            // Act
            var result = await controller.GetHealthCheck();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);

            // Verify payload contains only intended health status
            var json = JsonSerializer.Serialize(okResult.Value);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            Assert.True(root.TryGetProperty("status", out var statusProp));
            Assert.Equal("Healthy", statusProp.GetString());

            Assert.True(root.TryGetProperty("database", out var dbProp));
            Assert.Equal("Connected", dbProp.GetString());

            // Strictly verify that no sensitive fields or user data exist in the JSON payload
            Assert.False(root.TryGetProperty("passwordHash", out _));
            Assert.False(root.TryGetProperty("passwordSalt", out _));
            Assert.False(root.TryGetProperty("passwordResetToken", out _));
            Assert.False(root.TryGetProperty("login", out _));
            Assert.False(root.TryGetProperty("email", out _));
            Assert.DoesNotContain("test_admin", json);
            Assert.DoesNotContain("admin@example.com", json);
            Assert.DoesNotContain("LEAK_TOKEN_123", json);
        }

        [Fact]
        public async Task GetHealthCheck_WhenConnectivityReturnsFalse_ReturnsHttp503WithoutSensitiveData()
        {
            // Arrange
            var dbName = "HealthCheck_Failing_" + Guid.NewGuid();
            using var context = CreateFailingContext(dbName);
            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<ApiHealthController>>();
            var controller = new ApiHealthController(context, configMock.Object, loggerMock.Object);

            // Act
            var result = await controller.GetHealthCheck();

            // Assert
            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);

            var json = JsonSerializer.Serialize(statusResult.Value);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            Assert.True(root.TryGetProperty("status", out var statusProp));
            Assert.Equal("Unhealthy", statusProp.GetString());

            Assert.True(root.TryGetProperty("database", out var dbProp));
            Assert.Equal("Unavailable", dbProp.GetString());

            // Verify logger received a warning
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => true),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task GetHealthCheck_WhenDatabaseThrowsException_ReturnsHttp503WithoutLeakingExceptionDetails()
        {
            // Arrange
            var dbName = "HealthCheck_Throwing_" + Guid.NewGuid();
            using var context = CreateThrowingContext(dbName);
            var configMock = new Mock<IConfiguration>();
            var loggerMock = new Mock<ILogger<ApiHealthController>>();
            var controller = new ApiHealthController(context, configMock.Object, loggerMock.Object);

            // Act
            var result = await controller.GetHealthCheck();

            // Assert
            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);

            var json = JsonSerializer.Serialize(statusResult.Value);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            Assert.True(root.TryGetProperty("status", out var statusProp));
            Assert.Equal("Unhealthy", statusProp.GetString());

            Assert.True(root.TryGetProperty("database", out var dbProp));
            Assert.Equal("Unavailable", dbProp.GetString());

            // Ensure exception message and stack trace are NEVER leaked in response
            Assert.False(root.TryGetProperty("error", out _));
            Assert.False(root.TryGetProperty("message", out _));
            Assert.False(root.TryGetProperty("stackTrace", out _));
            Assert.DoesNotContain("Simulated connection failure", json);
            Assert.DoesNotContain("secret", json);

            // Verify logger recorded the error
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => true),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }
    }
}
