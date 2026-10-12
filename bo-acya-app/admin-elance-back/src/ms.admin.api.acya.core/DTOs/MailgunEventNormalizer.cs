using System;
using System.Globalization;
using System.Text.Json;

namespace ms.admin.api.acya.core.DTOs
{
    public static class MailgunEventNormalizer
    {
        public static NormalizedEmailEventDto Normalize(JsonElement eventData)
        {
            if (eventData.ValueKind != JsonValueKind.Object)
            {
                throw new ArgumentException("eventData must be a JSON object", nameof(eventData));
            }

            var eventId = GetStringProperty(eventData, "id") ?? string.Empty;
            var rawEvent = GetStringProperty(eventData, "event") ?? "unknown";
            var rawSeverity = GetStringProperty(eventData, "severity");

            string eventType = rawEvent;
            string status = rawEvent.ToUpperInvariant();

            if (rawEvent.Equals("failed", StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(rawSeverity, "permanent", StringComparison.OrdinalIgnoreCase))
                {
                    eventType = "bounced";
                    status = "BOUNCED";
                }
                else
                {
                    eventType = "failed";
                    status = "FAILED_TEMPORARY";
                }
            }
            else if (rawEvent.Equals("delivered", StringComparison.OrdinalIgnoreCase))
            {
                status = "DELIVERED";
            }
            else if (rawEvent.Equals("complained", StringComparison.OrdinalIgnoreCase))
            {
                status = "SPAM_COMPLAINT";
            }
            else if (rawEvent.Equals("rejected", StringComparison.OrdinalIgnoreCase))
            {
                status = "REJECTED";
            }

            // Recipient extraction
            var recipient = GetStringProperty(eventData, "recipient");
            if (string.IsNullOrWhiteSpace(recipient) && eventData.TryGetProperty("message", out var msgElem) && msgElem.ValueKind == JsonValueKind.Object)
            {
                if (msgElem.TryGetProperty("recipients", out var recipsArray) && recipsArray.ValueKind == JsonValueKind.Array && recipsArray.GetArrayLength() > 0)
                {
                    recipient = recipsArray[0].GetString();
                }
            }

            // Message-ID extraction
            string? messageId = null;
            if (eventData.TryGetProperty("message", out var msgNode) && msgNode.ValueKind == JsonValueKind.Object)
            {
                if (msgNode.TryGetProperty("headers", out var headersNode) && headersNode.ValueKind == JsonValueKind.Object)
                {
                    messageId = GetStringProperty(headersNode, "message-id")
                        ?? GetStringProperty(headersNode, "Message-Id");
                }
            }

            // Delivery Status & Details
            var reason = GetStringProperty(eventData, "reason")
                ?? GetNestedStringProperty(eventData, "delivery-status", "message")
                ?? GetNestedStringProperty(eventData, "deliveryStatus", "message")
                ?? GetNestedStringProperty(eventData, "delivery-status", "description")
                ?? GetNestedStringProperty(eventData, "deliveryStatus", "description");

            var description = GetNestedStringProperty(eventData, "delivery-status", "description")
                ?? GetNestedStringProperty(eventData, "deliveryStatus", "description");

            int? code = GetNestedIntProperty(eventData, "delivery-status", "code")
                ?? GetNestedIntProperty(eventData, "deliveryStatus", "code");

            // Timestamp parsing
            var timestamp = DateTime.UtcNow;
            if (eventData.TryGetProperty("timestamp", out var tsElem))
            {
                if (tsElem.ValueKind == JsonValueKind.Number && tsElem.TryGetDouble(out var tsVal))
                {
                    timestamp = DateTimeOffset.FromUnixTimeMilliseconds((long)(tsVal * 1000)).UtcDateTime;
                }
                else if (tsElem.ValueKind == JsonValueKind.String && double.TryParse(tsElem.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var tsStrVal))
                {
                    timestamp = DateTimeOffset.FromUnixTimeMilliseconds((long)(tsStrVal * 1000)).UtcDateTime;
                }
            }

            // User Variables / Metadata
            JsonElement? userVars = null;
            if (eventData.TryGetProperty("user-variables", out var uv1) && uv1.ValueKind == JsonValueKind.Object)
            {
                userVars = uv1;
            }
            else if (eventData.TryGetProperty("userVariables", out var uv2) && uv2.ValueKind == JsonValueKind.Object)
            {
                userVars = uv2;
            }

            string? tenantId = userVars.HasValue ? GetStringProperty(userVars.Value, "tenantId") : null;
            string? registrationId = userVars.HasValue ? GetStringProperty(userVars.Value, "registrationId") : null;
            string? correlationId = userVars.HasValue ? GetStringProperty(userVars.Value, "correlationId") : null;
            string? template = userVars.HasValue ? GetStringProperty(userVars.Value, "template") : null;

            return new NormalizedEmailEventDto
            {
                EventId = eventId,
                EventType = eventType,
                Status = status,
                Recipient = recipient ?? string.Empty,
                MessageId = messageId,
                Timestamp = timestamp,
                Details = new EventDetailsDto
                {
                    Reason = reason,
                    Severity = rawSeverity,
                    Code = code,
                    Description = description
                },
                Metadata = new EventMetadataDto
                {
                    TenantId = tenantId,
                    RegistrationId = registrationId,
                    CorrelationId = correlationId,
                    Template = template
                }
            };
        }

        private static string? GetStringProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.String)
                {
                    return prop.GetString();
                }
                if (prop.ValueKind == JsonValueKind.Number)
                {
                    return prop.GetRawText();
                }
            }
            return null;
        }

        private static string? GetNestedStringProperty(JsonElement element, string parentName, string childName)
        {
            if (element.TryGetProperty(parentName, out var parent) && parent.ValueKind == JsonValueKind.Object)
            {
                return GetStringProperty(parent, childName);
            }
            return null;
        }

        private static int? GetNestedIntProperty(JsonElement element, string parentName, string childName)
        {
            if (element.TryGetProperty(parentName, out var parent) && parent.ValueKind == JsonValueKind.Object)
            {
                if (parent.TryGetProperty(childName, out var child))
                {
                    if (child.ValueKind == JsonValueKind.Number && child.TryGetInt32(out var val))
                    {
                        return val;
                    }
                    if (child.ValueKind == JsonValueKind.String && int.TryParse(child.GetString(), out var strVal))
                    {
                        return strVal;
                    }
                }
            }
            return null;
        }
    }
}
