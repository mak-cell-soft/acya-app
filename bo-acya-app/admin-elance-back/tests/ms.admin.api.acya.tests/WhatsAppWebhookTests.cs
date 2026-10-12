using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.Controllers;
using System.Collections.Generic;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class WhatsAppWebhookTests
    {
        private const string TestVerifyToken = "test_whatsapp_secret_token_abc123";

        private IConfiguration CreateConfig(string? verifyToken = TestVerifyToken)
        {
            var dict = new Dictionary<string, string?>();
            if (verifyToken != null)
            {
                dict["WhatsAppSettings:VerifyToken"] = verifyToken;
            }

            return new ConfigurationBuilder()
                .AddInMemoryCollection(dict)
                .Build();
        }

        [Fact]
        public void VerifyWebhook_ValidTokenAndChallenge_Returns200WithRawChallenge()
        {
            var config = CreateConfig();
            var controller = new WhatsAppWebhooksController(config, NullLogger<WhatsAppWebhooksController>.Instance);

            var result = controller.VerifyWebhook("subscribe", TestVerifyToken, "challenge_1158201444");

            var contentResult = Assert.IsType<ContentResult>(result);
            Assert.Equal("challenge_1158201444", contentResult.Content);
            Assert.Equal("text/plain", contentResult.ContentType);
        }

        [Fact]
        public void VerifyWebhook_InvalidToken_Returns403Forbidden()
        {
            var config = CreateConfig();
            var controller = new WhatsAppWebhooksController(config, NullLogger<WhatsAppWebhooksController>.Instance);

            var result = controller.VerifyWebhook("subscribe", "wrong_token", "challenge_123");

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
            Assert.Equal("Forbidden", statusResult.Value);
        }

        [Fact]
        public void VerifyWebhook_MissingToken_Returns403Forbidden()
        {
            var config = CreateConfig();
            var controller = new WhatsAppWebhooksController(config, NullLogger<WhatsAppWebhooksController>.Instance);

            var result = controller.VerifyWebhook("subscribe", null, "challenge_123");

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
            Assert.Equal("Forbidden", statusResult.Value);
        }

        [Fact]
        public void VerifyWebhook_MissingChallenge_Returns400BadRequest()
        {
            var config = CreateConfig();
            var controller = new WhatsAppWebhooksController(config, NullLogger<WhatsAppWebhooksController>.Instance);

            var result = controller.VerifyWebhook("subscribe", TestVerifyToken, null);

            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(StatusCodes.Status400BadRequest, badRequestResult.StatusCode);
        }

        [Theory]
        [InlineData("publish")]
        [InlineData("unsubscribe")]
        [InlineData("")]
        [InlineData(null)]
        public void VerifyWebhook_InvalidOrMissingMode_Returns403Forbidden(string? mode)
        {
            var config = CreateConfig();
            var controller = new WhatsAppWebhooksController(config, NullLogger<WhatsAppWebhooksController>.Instance);

            var result = controller.VerifyWebhook(mode, TestVerifyToken, "challenge_123");

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
            Assert.Equal("Forbidden", statusResult.Value);
        }

        [Fact]
        public void VerifyWebhook_UnconfiguredSecret_Returns500InternalServerError()
        {
            var config = CreateConfig(verifyToken: null);
            var controller = new WhatsAppWebhooksController(config, NullLogger<WhatsAppWebhooksController>.Instance);

            var result = controller.VerifyWebhook("subscribe", TestVerifyToken, "challenge_123");

            var statusResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status500InternalServerError, statusResult.StatusCode);
        }
    }
}
