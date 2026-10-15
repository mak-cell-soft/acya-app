using System;
using System.Text.RegularExpressions;

namespace ms.admin.api.acya.Services
{
    public static class SchemaSanitizer
    {
        private static readonly Regex SafeIdentifierRegex = new Regex(@"^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

        public static bool IsValidIdentifier(string? identifier)
        {
            if (string.IsNullOrWhiteSpace(identifier)) return false;
            return SafeIdentifierRegex.IsMatch(identifier);
        }

        public static string QuoteIdentifier(string identifier)
        {
            if (!IsValidIdentifier(identifier))
            {
                throw new ArgumentException($"Invalid database identifier: '{identifier}'", nameof(identifier));
            }
            return $"\"{identifier}\"";
        }
    }
}
