import { Document } from "./document";

export class DocumentsRelationship {
    parentDocumentId!: number | null;
    parentDocument!: Document | null;
    childDocuments!: Document[] | null;
}