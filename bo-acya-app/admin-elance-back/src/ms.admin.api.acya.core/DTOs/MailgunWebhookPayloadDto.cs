using System.Text.Json;
using System.Text.Json.Serialization;

namespace ms.admin.api.acya.core.DTOs
{
    public class MailgunSignatureDto
    {
        [JsonPropertyName("timestamp")]
        public string? Timestamp { get; set; }

        [JsonPropertyName("token")]
        public string? Token { get; set; }

        [JsonPropertyName("signature")]
        public string? Signature { get; set; }
    }

    public class MailgunWebhookPayloadDto
    {
        [JsonPropertyName("signature")]
        public MailgunSignatureDto? Signature { get; set; }

        [JsonPropertyName("event-data")]
        public JsonElement? EventData { get; set; }

        [JsonPropertyName("eventData")]
        public JsonElement? EventDataCamelCase { get; set; }

        [JsonIgnore]
        public JsonElement EffectiveEventData =>
            EventData.HasValue && EventData.Value.ValueKind != JsonValueKind.Undefined
                ? EventData.Value
                : (EventDataCamelCase.HasValue ? EventDataCamelCase.Value : default);
    }
}
