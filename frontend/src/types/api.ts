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
  flagship_story: FlagshipStory;
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
  headline: string;
  about: string;
  experience: LinkedInExperience[];
}

export interface InteringOutput {
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
  note: string;
  target_field?: string;
}
