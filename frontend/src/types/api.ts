export interface ContactInfo {
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

export interface CVHeader {
  name: string;
  title: string;
  contact: ContactInfo;
}

export interface ExperienceEntry {
  role: string;
  company: string;
  period: string;
  context: string;
  results: string[];
}

export interface CVDocument {
  source_revision?: number;
  header: CVHeader;
  positioning_summary: string;
  key_results: string[];
  expertise: string[];
  experience: ExperienceEntry[];
  education: string[];
  certifications: string[];
}

export interface FlagshipStory {
  context: string;
  action: string;
  result_quantified: string;
}

export interface SupportingResult {
  metric: string;
  value: string;
  context: string;
}

export interface Positioning {
  primary_angle: string;
  target_buyers: string[];
  target_situations: string[];
  differentiators: string[];
}

export interface Evidence {
  flagship_story: FlagshipStory | null;
  supporting_results: SupportingResult[];
  expertise_areas: string[];
}

export interface KeyMessages {
  one_liner: string;
  elevator_pitch: string;
  proof_points: string[];
}

export interface Preferences {
  tone: string;
  exclusions: string[];
}

export interface PositioningDocument {
  positioning: Positioning;
  evidence: Evidence;
  key_messages: KeyMessages;
  preferences: Preferences;
}

export interface LinkedInExperience {
  company: string;
  role: string;
  context: string;
  achievements: string[];
}

export interface LinkedInOutput {
  source_revision?: number;
  headline: string;
  about: string;
  experience: LinkedInExperience[];
}

export interface InteringOutput {
  source_revision?: number;
  hook: string;
  product_cards: string[];
  profile_sections: Record<string, string>;
}

export type WriterType = "linkedin" | "cv" | "intering";

export interface UploadResponse {
  session_id: string;
  cv_text_preview: string;
  linkedin_available: boolean;
}

export interface IteratePayload {
  revision: number;
  note: string;
  target_field?: string;
}

export interface MemberProfile {
  additional_facts: string[];
  corrections: string[];
  goals: string[];
  working_style: string[];
  voice_examples: string[];
  exclusions: string[];
}

export type AnswerDisposition = "answered" | "skipped" | "confidential";
export interface ClarificationQuestion { id: string; topic: string; text: string }
export interface ClarificationAnswer {
  question_id: string;
  topic: string;
  question: string;
  text: string;
  disposition: AnswerDisposition;
}
export interface WorkflowState {
  status: "uploaded" | "clarifying" | "review" | "approved";
  revision: number;
  approved_revision: number | null;
  positioning: PositioningDocument | null;
  profile: MemberProfile;
  current_question: ClarificationQuestion | null;
  answers: ClarificationAnswer[];
  output_revisions: Partial<Record<WriterType, number>>;
  prompt_checksums: Record<string, string>;
}

export interface PromptItem {
  name: string;
  content: string;
  is_overlay: boolean;
}
