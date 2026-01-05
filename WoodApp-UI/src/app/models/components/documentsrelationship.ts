import { Document } from "./document";

export class DocumentsRelationship {
    ParentDocumentId!: number | null;
    ParentDocument!: Document | null;
    ChildDocuments!: Document[] | null;
}