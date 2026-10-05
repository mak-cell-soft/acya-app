using System;
using System.Text.RegularExpressions;

namespace ms.admin.api.acya.common
{
    public class CalculatedSchedule
    {
        public string Time { get; set; } = string.Empty;
        public string Timezone { get; set; } = string.Empty;
        public string UtcEquivalentTime { get; set; } = string.Empty;
        public string SystemdOnCalendar { get; set; } = string.Empty;
        public string ScheduleSummary { get; set; } = string.Empty;
        public DateTime NextRunTimeUtc { get; set; }
        public string NextRunTimeLocal { get; set; } = string.Empty;
    }

    public static class BackupScheduleCalculator
    {
        private static readonly Regex TimeRegex = new Regex("^([01][0-9]|2[0-3]):[0-5][0-9]$", RegexOptions.Compiled);

        public static (bool IsValid, string? ErrorMessage, TimeZoneInfo? TimeZone) Validate(
            bool enabled, string? frequency, string? time, string? timezone)
        {
            if (string.IsNullOrWhiteSpace(frequency) || !frequency.Trim().Equals("daily", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Currently only 'daily' backup frequency is supported.", null);
            }

            if (string.IsNullOrWhiteSpace(time) || !TimeRegex.IsMatch(time.Trim()))
            {
                return (false, "Invalid time format. Time must be in 24-hour HH:mm format (e.g., '02:00').", null);
            }

            if (string.IsNullOrWhiteSpace(timezone))
            {
                return (false, "Timezone is required (e.g., 'Africa/Tunis').", null);
            }

            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(timezone.Trim());
                return (true, null, tz);
            }
            catch (TimeZoneNotFoundException)
            {
                return (false, $"Timezone '{timezone}' is not a recognized IANA or system timezone identifier.", null);
            }
            catch (InvalidTimeZoneException)
            {
                return (false, $"Timezone '{timezone}' contains corrupted or invalid timezone data.", null);
            }
        }

        public static CalculatedSchedule Calculate(string time, string timezone, TimeZoneInfo? preloadedTz = null)
        {
            var tz = preloadedTz ?? TimeZoneInfo.FindSystemTimeZoneById(timezone.Trim());
            var trimmedTime = time.Trim();
            var parts = trimmedTime.Split(':');
            int hour = int.Parse(parts[0]);
            int minute = int.Parse(parts[1]);

            var nowUtc = DateTime.UtcNow;
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

            var scheduledLocalToday = new DateTime(nowLocal.Year, nowLocal.Month, nowLocal.Day, hour, minute, 0, DateTimeKind.Unspecified);
            var scheduledUtcToday = TimeZoneInfo.ConvertTimeToUtc(scheduledLocalToday, tz);

            var utcTimeString = scheduledUtcToday.ToString("HH:mm");
            var systemdOnCalendar = $"*-*-* {scheduledUtcToday:HH:mm:00} UTC";

            var nextLocal = scheduledLocalToday;
            if (nowLocal >= scheduledLocalToday)
            {
                nextLocal = scheduledLocalToday.AddDays(1);
            }

            var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocal, tz);

            return new CalculatedSchedule
            {
                Time = trimmedTime,
                Timezone = tz.Id,
                UtcEquivalentTime = utcTimeString,
                SystemdOnCalendar = systemdOnCalendar,
                ScheduleSummary = $"Daily at {trimmedTime} {tz.Id} ({utcTimeString} UTC)",
                NextRunTimeUtc = nextUtc,
                NextRunTimeLocal = $"{nextLocal:yyyy-MM-dd HH:mm} ({tz.Id})"
            };
        }
    }
}
