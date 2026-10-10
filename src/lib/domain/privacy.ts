import { WHATSAPP_SUSPENDED } from "@/lib/domain/constants";

export const PRIVACY_DRAFT_BANNER =
  "Draft for church approval. This notice is not legal advice. The church should review it, including against the Nigeria Data Protection Act 2023, before launch.";

const PRIVACY_SECTION_LIST = [
  {
    title: "Who is collecting this",
    body: "Encounter Worship collects this information so the church can register you for a program, contact you about that registration, and care for people who ask for prayer.",
  },
  {
    title: "What we ask for",
    body: "The form asks for your name, phone number, area of residence and age range. Email, gender, marital status and a prayer request are optional. If you are under 18, a parent or guardian should know about the registration.",
  },
  {
    title: "How it is used",
    body: "Staff use the registration list to prepare for the program and to find your record if you enquire. Prayer requests are not used for statistics, ordinary exports, or public pages.",
  },
  {
    title: "Who can see it",
    body: "Authorised church staff can see registration records for the programs they are assigned to. Prayer requests are limited further, to people the church has specifically authorised. Other attendees cannot see your record.",
  },
  {
    title: "WhatsApp",
    body: "A WhatsApp confirmation is sent only if you tick that choice. Registering does not sign you up for unrelated messages. The confirmation does not include your prayer request. A phone number does not guarantee that WhatsApp can deliver the message. The confirmation on the screen is still valid.",
  },
  {
    title: "How long it is kept",
    body: "The church has not yet set a final retention period. Until that decision is recorded here, records are kept for running the program and are then reviewed for deletion or removal of personal details. You can contact the church about your information using the contact details on the program page.",
  },
] as const;

export const PRIVACY_SECTIONS = WHATSAPP_SUSPENDED
  ? PRIVACY_SECTION_LIST.filter((section) => section.title !== "WhatsApp")
  : PRIVACY_SECTION_LIST;
