using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ms.admin.api.acya.common;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.infrastructure.Services;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class EmailDeliveryEventTests
    {
        private MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        private EmailService CreateService(MasterDbContext context)
        {
            var httpClient = new HttpClient();
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "N8nEmailService:BaseUrl", "http://n8n:5678" },
                { "N8nEmailService:ApiKey", "test-key" }
            }).Build();

            return new EmailService(context, httpClient, config, NullLogger<EmailService>.Instance);
        }

        private EmailLog CreateSampleEmailLog(
            MasterDbContext context,
            long tenantId = 46,
            string messageId = "<20261012105710.a1aa687feb7f06e1@acya.site>",
            string correlationId = "corr-test-1",
            string initialStatus = "ACCEPTED")
        {
            var log = new EmailLog
            {
                TenantId = tenantId,
                Recipient = "user@test.com",
                Template = "welcome",
                MessageId = messageId,
                CorrelationId = correlationId,
                CurrentStatus = initialStatus,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.EmailLogs.Add(log);
            context.SaveChanges();
            return log;
        }

        // ============================================================
        // 1. Valid Mailgun webhook signature
        // ============================================================
        [Fact]
        public void WebhookSignature_ValidSignature_VerifiesSuccessfully()
        {
            var testSigningKey = "synthetic-test-signing-key-12345678";
            var timestamp = "1791802631";
            var token = "38535149e937083324ecbb0581915094a3033be49b33fd9018";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(testSigningKey));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(timestamp + token));
            var validSignature = Convert.ToHexString(hash).ToLowerInvariant();

            var isValid = MailgunSignatureValidator.VerifySignature(testSigningKey, timestamp, token, validSignature);
            Assert.True(isValid);
        }

        [Fact]
        public async Task EmailWebhooksController_ValidSignatureOrToken_ReturnsOk()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var expectedKey = "test-secret-key-999";

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", expectedKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            controller.Request.Headers["Authorization"] = $"Bearer {expectedKey}";

            var sampleLog = CreateSampleEmailLog(context, 46, "msg-auth-test@acya.site");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-auth-valid",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "msg-auth-test@acya.site"
            };

            var result = await controller.ReceiveEvent(dto) as OkObjectResult;
            Assert.NotNull(result);
            Assert.Equal(200, result.StatusCode);
        }

        // ============================================================
        // 2. Invalid signature rejection
        // ============================================================
        [Fact]
        public void WebhookSignature_InvalidSignature_Rejects()
        {
            var testSigningKey = "synthetic-test-signing-key-12345678";
            var timestamp = "1791802631";
            var token = "38535149e937083324ecbb0581915094a3033be49b33fd9018";
            var invalidSignature = "0000000000000000000000000000000000000000000000000000000000000000";

            var isValid = MailgunSignatureValidator.VerifySignature(testSigningKey, timestamp, token, invalidSignature);
            Assert.False(isValid);
        }

        [Fact]
        public async Task EmailWebhooksController_InvalidToken_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "correct-secret-token" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            controller.Request.Headers["Authorization"] = "Bearer wrong-secret-token";

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-invalid-auth",
                EventType = "delivered",
                Status = "DELIVERED"
            };

            var result = await controller.ReceiveEvent(dto) as UnauthorizedObjectResult;
            Assert.NotNull(result);
            Assert.Equal(401, result.StatusCode);
        }

        // ============================================================
        // 3. Missing signature rejection
        // ============================================================
        [Fact]
        public void WebhookSignature_MissingFields_Rejects()
        {
            var testSigningKey = "synthetic-test-signing-key-12345678";

            Assert.False(MailgunSignatureValidator.VerifySignature(null, "123", "tok", "sig"));
            Assert.False(MailgunSignatureValidator.VerifySignature(testSigningKey, null, "tok", "sig"));
            Assert.False(MailgunSignatureValidator.VerifySignature(testSigningKey, "123", null, "sig"));
            Assert.False(MailgunSignatureValidator.VerifySignature(testSigningKey, "123", "tok", null));
            Assert.False(MailgunSignatureValidator.VerifySignature("", "123", "tok", "sig"));
        }

        [Fact]
        public async Task EmailWebhooksController_MissingAuthHeader_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "required-secret-token" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            // No Authorization or X-Webhook-Secret header

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-missing-auth",
                EventType = "delivered",
                Status = "DELIVERED"
            };

            var result = await controller.ReceiveEvent(dto) as UnauthorizedObjectResult;
            Assert.NotNull(result);
            Assert.Equal(401, result.StatusCode);
        }

        // ============================================================
        // 4. Message IDs with angle brackets
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_MessageIdWithAngleBrackets_CorrelatesSuccessfully()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var log = CreateSampleEmailLog(context, 46, "<20261012105710.a1aa687feb7f06e1@acya.site>");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-brackets-1",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "<20261012105710.a1aa687feb7f06e1@acya.site>",
                Timestamp = DateTime.UtcNow
            };

            var processed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(processed);

            var updatedLog = await context.EmailLogs.FindAsync(log.Id);
            Assert.NotNull(updatedLog);
            Assert.Equal("DELIVERED", updatedLog.CurrentStatus);
            Assert.Equal("20261012105710.a1aa687feb7f06e1@acya.site", updatedLog.MessageId);

            var persistedEvent = await context.EmailLogEvents.FirstOrDefaultAsync(e => e.EventId == "evt-brackets-1");
            Assert.NotNull(persistedEvent);
            Assert.Equal(log.Id, persistedEvent.EmailLogId);
        }

        // ============================================================
        // 5. Message IDs without angle brackets
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_MessageIdWithoutAngleBrackets_CorrelatesSuccessfully()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            // Stored with brackets in DB
            var log = CreateSampleEmailLog(context, 46, "<20261012105710.a1aa687feb7f06e1@acya.site>");

            // Incoming without brackets (as Mailgun event header provides)
            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-no-brackets-1",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "20261012105710.a1aa687feb7f06e1@acya.site",
                Timestamp = DateTime.UtcNow
            };

            var processed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(processed);

            var updatedLog = await context.EmailLogs.FindAsync(log.Id);
            Assert.NotNull(updatedLog);
            Assert.Equal("DELIVERED", updatedLog.CurrentStatus);
            Assert.Equal("20261012105710.a1aa687feb7f06e1@acya.site", updatedLog.MessageId);
        }

        // ============================================================
        // 6. Message IDs with surrounding whitespace
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_MessageIdWithSurroundingWhitespace_CorrelatesSuccessfully()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var log = CreateSampleEmailLog(context, 46, "<20261012105710.a1aa687feb7f06e1@acya.site>");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-whitespace-1",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "   <20261012105710.a1aa687feb7f06e1@acya.site>   ",
                Timestamp = DateTime.UtcNow
            };

            var processed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(processed);

            var updatedLog = await context.EmailLogs.FindAsync(log.Id);
            Assert.NotNull(updatedLog);
            Assert.Equal("DELIVERED", updatedLog.CurrentStatus);
        }

        // ============================================================
        // 7. Correlation ID fallback
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_CorrelationIdFallback_MatchesWhenMessageIdMissing()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var log = CreateSampleEmailLog(context, 46, "<msg-corr-1@acya.site>", correlationId: "0HNP5UAQD145N:00000001");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-fallback-corr",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = null,
                Metadata = new EventMetadataDto
                {
                    CorrelationId = "0HNP5UAQD145N:00000001"
                }
            };

            var processed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(processed);

            var updatedLog = await context.EmailLogs.FindAsync(log.Id);
            Assert.NotNull(updatedLog);
            Assert.Equal("DELIVERED", updatedLog.CurrentStatus);
        }

        // ============================================================
        // 8. Tenant metadata fallback
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_TenantMetadataFallback_MatchesMostRecentRecord()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var log1 = CreateSampleEmailLog(context, 46, "<msg-tenant-1@acya.site>", correlationId: "corr-old");
            var log2 = CreateSampleEmailLog(context, 46, "<msg-tenant-2@acya.site>", correlationId: "corr-new");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-fallback-tenant",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = null,
                Metadata = new EventMetadataDto
                {
                    TenantId = "46"
                }
            };

            var processed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(processed);

            var updatedLog2 = await context.EmailLogs.FindAsync(log2.Id);
            Assert.NotNull(updatedLog2);
            Assert.Equal("DELIVERED", updatedLog2.CurrentStatus);
        }

        // ============================================================
        // 9. Unknown Message ID behavior
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_UnknownMessageId_ReturnsFalseAndDoesNotPersist()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            CreateSampleEmailLog(context, 46, "<known-msg@acya.site>");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-unknown-msg",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "completely-unknown-message-id@other.site"
            };

            var processed = await service.ProcessDeliveryEventAsync(dto);
            Assert.False(processed);

            var persisted = await context.EmailLogEvents.AnyAsync(e => e.EventId == "evt-unknown-msg");
            Assert.False(persisted);
        }

        // ============================================================
        // 10. Duplicate delivery-event handling
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_DuplicateDeliveryEvent_HandledIdempotently()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var log = CreateSampleEmailLog(context, 46, "msg-dup-test@acya.site");

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-dup-unique-123",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "msg-dup-test@acya.site"
            };

            // First delivery
            var firstProcessed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(firstProcessed);
            Assert.Equal(1, await context.EmailLogEvents.CountAsync(e => e.EventId == "evt-dup-unique-123"));

            // Second delivery (duplicate retry)
            var secondProcessed = await service.ProcessDeliveryEventAsync(dto);
            Assert.True(secondProcessed);
            Assert.Equal(1, await context.EmailLogEvents.CountAsync(e => e.EventId == "evt-dup-unique-123"));
        }

        // ============================================================
        // 11. Correct audit status transitions
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_StatusTransitions_UpdatesAuditStatusCorrectly()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var log = CreateSampleEmailLog(context, 46, "msg-transitions@acya.site", initialStatus: "ACCEPTED");

            // Event 1: Delivered
            var deliveredDto = new NormalizedEmailEventDto
            {
                EventId = "evt-trans-delivered",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "msg-transitions@acya.site"
            };
            await service.ProcessDeliveryEventAsync(deliveredDto);

            var logAfterDelivered = await context.EmailLogs.FindAsync(log.Id);
            Assert.Equal("DELIVERED", logAfterDelivered!.CurrentStatus);

            // Event 2: Bounced / Failed
            var bouncedDto = new NormalizedEmailEventDto
            {
                EventId = "evt-trans-bounced",
                EventType = "bounced",
                Status = "BOUNCED",
                MessageId = "msg-transitions@acya.site",
                Details = new EventDetailsDto { Reason = "Mailbox full" }
            };
            await service.ProcessDeliveryEventAsync(bouncedDto);

            var logAfterBounced = await context.EmailLogs.FindAsync(log.Id);
            Assert.Equal("BOUNCED", logAfterBounced!.CurrentStatus);
            Assert.Equal(2, await context.EmailLogEvents.CountAsync(e => e.EmailLogId == log.Id));
        }

        // ============================================================
        // 12. No cross-tenant event updates
        // ============================================================
        [Fact]
        public async Task ProcessDeliveryEvent_CrossTenantEvent_RejectedSafely()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            // Record belongs to Tenant 46
            var log = CreateSampleEmailLog(context, 46, "msg-tenant-isolated@acya.site");

            // Webhook event provides matching message ID, but claims Metadata.TenantId = 99 (Tenant B)
            var maliciousDto = new NormalizedEmailEventDto
            {
                EventId = "evt-cross-tenant-1",
                EventType = "delivered",
                Status = "DELIVERED",
                MessageId = "msg-tenant-isolated@acya.site",
                Metadata = new EventMetadataDto
                {
                    TenantId = "99" // Mismatched tenant
                }
            };

            var processed = await service.ProcessDeliveryEventAsync(maliciousDto);
            Assert.False(processed);

            // Verify status on Tenant 46 record remains unchanged
            var unchangedLog = await context.EmailLogs.FindAsync(log.Id);
            Assert.Equal("ACCEPTED", unchangedLog!.CurrentStatus);

            // Verify no event was added
            var eventPersisted = await context.EmailLogEvents.AnyAsync(e => e.EventId == "evt-cross-tenant-1");
            Assert.False(eventPersisted);
        }

        // ============================================================
        // 13. Dedicated /mailgun Endpoint Authoritative Verification Tests
        // ============================================================

        private MailgunWebhookPayloadDto CreateMailgunPayload(
            string signingKey,
            string timestamp,
            string token,
            string eventId,
            string eventType,
            string messageId,
            long tenantId,
            bool invalidateSig = false,
            string? customCorrelationId = null)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signingKey));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(timestamp + token));
            var signature = Convert.ToHexString(hash).ToLowerInvariant();
            if (invalidateSig)
            {
                signature = "0000000000000000000000000000000000000000000000000000000000000000";
            }

            var eventDataObj = new Dictionary<string, object?>
            {
                { "id", eventId },
                { "event", eventType },
                { "timestamp", double.Parse(timestamp) },
                { "recipient", "user@test.com" },
                { "message", new Dictionary<string, object?>
                    {
                        { "headers", new Dictionary<string, string?>
                            {
                                { "message-id", messageId }
                            }
                        }
                    }
                },
                { "user-variables", new Dictionary<string, string?>
                    {
                        { "tenantId", tenantId.ToString() },
                        { "correlationId", customCorrelationId ?? "corr-test-1" },
                        { "template", "welcome" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(eventDataObj);
            var eventDataDoc = JsonDocument.Parse(json);

            return new MailgunWebhookPayloadDto
            {
                Signature = new MailgunSignatureDto
                {
                    Timestamp = timestamp,
                    Token = token,
                    Signature = signature
                },
                EventData = eventDataDoc.RootElement.Clone()
            };
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_ValidSignature_ProcessesEventAndReturnsOk()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            var nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            var sampleLog = CreateSampleEmailLog(context, 46, "msg-mg-valid@acya.site");

            var payload = CreateMailgunPayload(
                signingKey,
                nowSec,
                "token-mg-valid",
                "evt-mg-valid-1",
                "delivered",
                "msg-mg-valid@acya.site",
                46);

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as OkObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(200, actionResult.StatusCode);

            var updatedLog = await context.EmailLogs.FindAsync(sampleLog.Id);
            Assert.Equal("DELIVERED", updatedLog!.CurrentStatus);
            Assert.True(await context.EmailLogEvents.AnyAsync(e => e.EventId == "evt-mg-valid-1"));
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_InvalidSignature_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            var nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            CreateSampleEmailLog(context, 46, "msg-mg-invalid@acya.site");

            var payload = CreateMailgunPayload(
                signingKey,
                nowSec,
                "token-mg-invalid",
                "evt-mg-invalid-1",
                "delivered",
                "msg-mg-invalid@acya.site",
                46,
                invalidateSig: true);

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);

            // Verify no event recorded
            Assert.False(await context.EmailLogEvents.AnyAsync(e => e.EventId == "evt-mg-invalid-1"));
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_MissingSignatureObject_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "valid-key-99" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);

            var payload = new MailgunWebhookPayloadDto
            {
                Signature = null,
                EventData = JsonDocument.Parse("{}").RootElement
            };

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_MissingSignatureParameters_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "valid-key-99" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);

            var payload = new MailgunWebhookPayloadDto
            {
                Signature = new MailgunSignatureDto
                {
                    Timestamp = "1791802631",
                    Token = "", // missing token
                    Signature = "some-sig"
                },
                EventData = JsonDocument.Parse("{}").RootElement
            };

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_MissingSigningKeyConfig_ReturnsInternalServerErrorFailClosed()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            // Empty signing key in config
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);

            var payload = new MailgunWebhookPayloadDto
            {
                Signature = new MailgunSignatureDto
                {
                    Timestamp = "1791802631",
                    Token = "token-1",
                    Signature = "sig-1"
                },
                EventData = JsonDocument.Parse("{}").RootElement
            };

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as ObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(500, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_ExpiredTimestamp_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            // Timestamp older than 15 minutes (1000 seconds ago)
            var expiredSec = (DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 1000).ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);

            var payload = CreateMailgunPayload(
                signingKey,
                expiredSec,
                "token-expired",
                "evt-mg-expired-1",
                "delivered",
                "msg-mg-expired@acya.site",
                46);

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_FutureTimestampTooFar_ReturnsUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            // Timestamp in the future by 1000 seconds
            var futureSec = (DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 1000).ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);

            var payload = CreateMailgunPayload(
                signingKey,
                futureSec,
                "token-future",
                "evt-mg-future-1",
                "delivered",
                "msg-mg-future@acya.site",
                46);

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_MissingOrMalformedEventData_ReturnsBadRequest()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            var nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signingKey));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(nowSec + "token-malformed"));
            var signature = Convert.ToHexString(hash).ToLowerInvariant();

            var payload = new MailgunWebhookPayloadDto
            {
                Signature = new MailgunSignatureDto
                {
                    Timestamp = nowSec,
                    Token = "token-malformed",
                    Signature = signature
                },
                EventData = null // Missing event-data
            };

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as BadRequestObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(400, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_DuplicateEvent_IsIdempotent()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            var nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            CreateSampleEmailLog(context, 46, "msg-mg-dup@acya.site");

            var payload = CreateMailgunPayload(
                signingKey,
                nowSec,
                "token-mg-dup",
                "evt-mg-dup-unique",
                "delivered",
                "msg-mg-dup@acya.site",
                46);

            // First delivery
            var res1 = await controller.ReceiveMailgunWebhook(payload) as OkObjectResult;
            Assert.NotNull(res1);
            Assert.Equal(200, res1.StatusCode);
            Assert.Equal(1, await context.EmailLogEvents.CountAsync(e => e.EventId == "evt-mg-dup-unique"));

            // Second delivery (duplicate retry)
            var res2 = await controller.ReceiveMailgunWebhook(payload) as OkObjectResult;
            Assert.NotNull(res2);
            Assert.Equal(200, res2.StatusCode);
            Assert.Equal(1, await context.EmailLogEvents.CountAsync(e => e.EventId == "evt-mg-dup-unique"));
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_MessageIdNormalization_CorrelatesAccurately()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            var nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            // Stored with angle brackets
            var sampleLog = CreateSampleEmailLog(context, 46, "<20261012105710.test@acya.site>");

            // Webhook delivers without angle brackets
            var payload = CreateMailgunPayload(
                signingKey,
                nowSec,
                "token-mg-norm",
                "evt-mg-norm-1",
                "delivered",
                "20261012105710.test@acya.site",
                46);

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as OkObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(200, actionResult.StatusCode);

            var updatedLog = await context.EmailLogs.FindAsync(sampleLog.Id);
            Assert.Equal("DELIVERED", updatedLog!.CurrentStatus);
        }

        [Fact]
        public async Task ReceiveMailgunWebhook_CrossTenantEvent_RejectedSafely()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);
            var signingKey = "test-mailgun-signing-key-123456";
            var nowSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", signingKey }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            // Record belongs to tenant 46
            var sampleLog = CreateSampleEmailLog(context, 46, "msg-mg-isolated@acya.site");

            // Malicious webhook claims tenant 99
            var payload = CreateMailgunPayload(
                signingKey,
                nowSec,
                "token-mg-cross",
                "evt-mg-cross-1",
                "delivered",
                "msg-mg-isolated@acya.site",
                99);

            var actionResult = await controller.ReceiveMailgunWebhook(payload) as OkObjectResult;
            Assert.NotNull(actionResult);

            // Verify status on Tenant 46 record remains unchanged
            var unchangedLog = await context.EmailLogs.FindAsync(sampleLog.Id);
            Assert.Equal("ACCEPTED", unchangedLog!.CurrentStatus);

            // Verify no event was persisted
            Assert.False(await context.EmailLogEvents.AnyAsync(e => e.EventId == "evt-mg-cross-1"));
        }

        // ============================================================
        // 14. Fail-Closed Authentication on Legacy /events Endpoint
        // ============================================================

        [Fact]
        public async Task ReceiveEvent_LegacyEndpoint_MissingConfig_FailsClosedWithUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            // Completely unconfigured webhook secret
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "" },
                { "WebhookSettings:Secret", "" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-unauth-bypass-1",
                EventType = "delivered",
                Status = "DELIVERED"
            };

            var actionResult = await controller.ReceiveEvent(dto) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);
        }

        [Fact]
        public async Task ReceiveEvent_LegacyEndpoint_MissingCredentials_FailsClosedWithUnauthorized()
        {
            var context = CreateInMemoryDbContext();
            var service = CreateService(context);

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "MailgunSettings:WebhookSigningKey", "valid-secret-key-123" }
            }).Build();

            var controller = new EmailWebhooksController(service, config);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
            // No Authorization header or X-Webhook-Secret provided

            var dto = new NormalizedEmailEventDto
            {
                EventId = "evt-unauth-bypass-2",
                EventType = "delivered",
                Status = "DELIVERED"
            };

            var actionResult = await controller.ReceiveEvent(dto) as UnauthorizedObjectResult;
            Assert.NotNull(actionResult);
            Assert.Equal(401, actionResult.StatusCode);
        }
    }
}
