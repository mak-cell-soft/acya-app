using System;
using System.Collections.Generic;

namespace ms.admin.api.acya.core.DTOs
{
    public class SupportTicketFilterDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? TenantSlug { get; set; }
        public long? TenantId { get; set; }
        public string? Priority { get; set; }
        public string? Category { get; set; }
        public DateTime? CreatedFrom { get; set; }
        public DateTime? CreatedTo { get; set; }
        public string? Search { get; set; }
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
