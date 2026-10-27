using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace ms.admin.api.acya.core.DTOs
{
    public static class SupportTicketStatuses
    {
        public const string New = "New";
        public const string InProgress = "InProgress";
        public const string WaitingForCustomer = "WaitingForCustomer";
        public const string Resolved = "Resolved";
        public const string Closed = "Closed";

        public static readonly string[] All = { New, InProgress, WaitingForCustomer, Resolved, Closed };

        private static readonly HashSet<string> AllSet = new(All, StringComparer.OrdinalIgnoreCase);

        public static bool IsValid(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            return AllSet.Contains(status.Trim());
        }

        public static string Normalize(string status)
        {
            var trimmed = status.Trim();
            foreach (var s in All)
            {
                if (string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase))
                    return s;
            }
            return trimmed;
        }
    }

    public class SupportTicketFilterDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? TenantSlug { get; set; }
        public long? TenantId { get; set; }
        public string? Priority { get; set; }
        public string? Category { get; set; }
        public string? Status { get; set; }
        public DateTime? CreatedFrom { get; set; }
        public DateTime? CreatedTo { get; set; }
        public string? Search { get; set; }
    }

    public class UpdateTicketStatusRequestDto
    {
        [Required(ErrorMessage = "Le statut est requis.")]
        public string Status { get; set; } = string.Empty;
    }

    public class UpdateTicketStatusResponseDto
    {
        public int TicketId { get; set; }
        public string TicketReference { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    public class SupportTicketListItemDto
    {
        public int Id { get; set; }
        public string TicketReference { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Subcategory { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = SupportTicketStatuses.New;
        public string Subject { get; set; } = string.Empty;
        public bool HasAttachment { get; set; }
        public string? AttachmentFileName { get; set; }
        public long? AttachmentSizeBytes { get; set; }
        public int EmailStatus { get; set; }
        public string EmailStatusText { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SupportTicketDetailDto
    {
        public int Id { get; set; }
        public string TicketReference { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string EnterpriseName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Subcategory { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Status { get; set; } = SupportTicketStatuses.New;
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CurrentRoute { get; set; }
        public string? AppVersion { get; set; }
        public string? ContextData { get; set; }
        public bool HasAttachment { get; set; }
        public string? AttachmentFileName { get; set; }
        public string? AttachmentContentType { get; set; }
        public long? AttachmentSizeBytes { get; set; }
        public int EmailStatus { get; set; }
        public string EmailStatusText { get; set; } = string.Empty;
        public string? EmailError { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SupportTicketPagedResultDto
    {
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public List<SupportTicketListItemDto> Items { get; set; } = new();
    }
}
