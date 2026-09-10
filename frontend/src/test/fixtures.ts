import type {
  PositioningDocument,
  CVDocument,
  LinkedInOutput,
  InteringOutput,
  WorkflowState,
} from "../types/api";

export const samplePositioning: PositioningDocument = {
  positioning: {
    primary_angle: "Testaaja",
    target_buyers: ["CEO"],
    target_situations: ["Skaalausvaihe"],
    differentiators: ["Operaattori"],
  },
  evidence: {
    flagship_story: {
      context: "Yritys X",
      action: "Skaalasin",
      result_quantified: "€2M → €20M",
    },
    supporting_results: [],
    expertise_areas: ["GTM"],
  },
  key_messages: {
    one_liner: "Skaalaaja",
    elevator_pitch: "Olen operaattori.",
    proof_points: ["€2M → €20M", "10x", "200 konsulttia"],
  },
  preferences: {
    tone: "Suora",
    exclusions: ["Ei konsultti-framingia"],
  },
};

export const sampleLinkedIn: LinkedInOutput = {
  source_revision: 3,
  headline: "Interim CEO | Skaalaaja",
  about: "Skaalasin €2M → €20M.",
  experience: [
    {
      role: "Interim CEO",
      company: "Yritys X",
      context: "Skaalaus.",
      achievements: ["10x kasvu", "P&L €25M", "200 konsulttia"],
    },
  ],
};

export const sampleCv: CVDocument = {
  source_revision: 3,
  header: {
    name: "Testi Henkilö",
    title: "Interim CEO",
    contact: {
      email: "testi@example.com",
      phone: null,
      location: null,
      linkedin: null,
    },
  },
  positioning_summary: "Skaalannut B2B-liiketoiminnan.",
  key_results: ["€2M → €20M", "10x", "200 konsulttia"],
  expertise: ["GTM", "P&L"],
  experience: [
    {
      role: "Interim CEO",
      company: "Yritys X",
      period: "9/2025 – 2/2026",
      context: "Skaalaus.",
      results: ["10x kasvu", "P&L €25M"],
    },
  ],
  education: ["Insinööri 2003"],
  certifications: ["HHJ 2023"],
};

export const sampleIntering: InteringOutput = {
  source_revision: 3,
  hook: "Skaalaaja | IT | €5–€30M | Operaattori",
  product_cards: ["Kortti 1.", "Kortti 2."],
  profile_sections: {
    "Kuka minä olen?": "Olen operaattori.",
    "Miksi juuri minä olen timanttinen interim?": "Tehnyt itse.",
    "Tehtävät joihin sovin parhaiten": "Skaalaus, GTM.",
    "Aikaisempi kokemus": "B2B-palveluyritykset.",
    "Aikaisempi Interim-kokemus": "10 vuotta.",
  },
};

export const sampleWorkflow: WorkflowState = {
  status: "approved", revision: 3, approved_revision: 3,
  positioning: samplePositioning,
  profile: { additional_facts: [], corrections: [], goals: [], working_style: [], voice_examples: [], exclusions: [] },
  current_question: null, answers: [], output_revisions: {}, prompt_checksums: {},
};
