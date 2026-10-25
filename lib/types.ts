export interface HackatimeStats {
  totalSeconds: number;
  aiSeconds: number;
  combinedSeconds: number;
  projectName: string;
}

export interface SubmissionPayload {
  firstName: string;
  lastName: string;
  email: string;
  githubUsername: string;
  codeUrl: string;
  playableUrl: string;
  hackatimeProject: string;
  description: string;
  howDidYouHear: string;
  whatAreWeDoingWell: string;
  howCanWeImprove: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  country: string;
  zipCode: string;
  birthday: string;
}

export interface AirtableAttachment {
  url: string;
  filename: string;
}

export interface AirtableRecord {
  "Code URL": string;
  "Playable URL": string;
  "How did you hear about this?": string;
  "What are we doing well?": string;
  "How can we improve?": string;
  "First Name": string;
  "Last Name": string;
  Email: string;
  Screenshot?: AirtableAttachment[];
  Description: string;
  "GitHub Username": string;
  "Address (Line 1)": string;
  "Address (Line 2)"?: string;
  City: string;
  "State / Province": string;
  Country: string;
  "ZIP / Postal Code": string;
  Birthday: string;
  "Slack Handle": string;
  "ID Verification Status"?: string;
  "Hackatime Project"?: string;
  "Hackatime Project Breakdown"?: string;
  "Normal Coding Hours": number;
  "AI Coding Hours": number;
  "Lapse Hours"?: number;
  "Justification - Lapse Links, comma-separated"?: string;
  "Justification - Specific Technical Features"?: string;
  "Justification - Deflation Justification"?: string;
  "Justification - Additional Justification"?: string;
  "Justification - Submitter Hackatime ID"?: string;
  "Justification - Hackatime Project Name(s) + Date Range(s)"?: string;
  Status: "Draft" | "Pending" | "Approved" | "Rejected";
  Notes?: string;
  "Optional - Override Hours Spent"?: number;
  "Optional - Override Hours Spent Justification"?: string;
  "Automation - Submit to Unified YSWS"?: boolean;
  "Unified Synced At"?: string;
  "Tag Claimed"?: boolean;
  "Tag Claimed At"?: string;
  "Update Of"?: string;
  "Hackatime Stats Through"?: string;
}

export interface AirtableRecordWithId extends AirtableRecord {
  _id: string;
  _createdTime: string;
}

export interface ReviewOps {
  "Submission ID": string;
  "Needs Changes"?: boolean;
  "Changes Requested Count"?: number;
  "Claimed By"?: string | null;
  "Claimed At"?: string | null;
  "Fulfillment Status"?: "Not Started" | "Claimed" | "Shipped";
  "Tracking Note"?: string;
  "Shipped At"?: string | null;
  "Checklist - Title Not Placeholder"?: boolean;
  "Checklist - Has README"?: boolean;
  "Checklist - Demo Not Sleeping"?: boolean;
  "Checklist - Demo Visitable"?: boolean;
}

export interface ReviewOpsWithId extends ReviewOps {
  _id: string;
}

export interface ShopItem {
  Name: string;
  Description: string;
  Price: number;
  Stock: number;
  "Is Physical": boolean;
  "Sub-Description"?: string;
  Image?: AirtableAttachment[];
  Active: boolean;
  Category?: string;
  Starred?: boolean;
  "Unlimited Stock"?: boolean;
}

export interface ShopItemWithId extends ShopItem {
  _id: string;
  Variants?: ShopItemVariantWithId[];
}

export interface ShopItemVariant {
  Item: string[];
  Label: string;
  Stock?: number;
  Price?: number;
}

export interface ShopItemVariantWithId extends ShopItemVariant {
  _id: string;
}

export interface ShopOrder {
  "Buyer Email": string;
  "Buyer Name": string;
  Item: string[];
  "Item Name": string;
  Quantity: number;
  "Total Stamps Spent": number;
  Status: "Pending" | "Fulfilled" | "Cancelled";
  "Shipping Address"?: string;
  "Fulfillment Notes"?: string;
  Label?: string;
  "Order Group"?: string;
}

export interface ShopOrderWithId extends ShopOrder {
  _id: string;
  _createdTime: string;
}

export interface Login {
  Email: string;
  Name?: string;
  "Slack ID"?: string;
  "First Login At": string;
  "Last Login At": string;
  "Login Count": number;
  "Last Active At"?: string;
}

export interface LoginWithId extends Login {
  _id: string;
}

export interface StampAdjustment {
  Email: string;
  Amount: number;
  Reason: string;
  "Created By": string;
  "Created At": string;
}

export interface StampAdjustmentWithId extends StampAdjustment {
  _id: string;
}
