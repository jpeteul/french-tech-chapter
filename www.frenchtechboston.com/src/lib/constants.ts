import { CHAPTER } from './chapter-config';

// Re-export chapter config values for backwards compatibility
export const SITE_TITLE = CHAPTER.name;
export const SITE_DESCRIPTION = CHAPTER.description;
export const CONTACT_EMAIL = CHAPTER.contactEmail;

export const SOCIAL_LINKS = CHAPTER.socialLinks;

export const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Events', href: '/events' },
  { label: 'Resources', href: '/resources' },
  { label: 'News', href: '/news' },
  { label: 'Contact', href: '/contact' },
];

/**
 * BOARD MEMBERS
 *
 * This is a fallback list of board members displayed when the database is unavailable.
 * In production, board members are typically managed via the admin dashboard and stored in the database.
 *
 * To set up your chapter:
 * 1. Add your board member photos to /public/images/board/
 * 2. Update this array with your board members
 * 3. Or manage board members directly via the admin dashboard after deployment
 */
export const BOARD_MEMBERS = [
  {
    name: 'Board Member 1',
    title: 'President',
    company: 'Company Name',
    linkedin: 'linkedin-username',
    image: '/images/board/placeholder-1.jpg',
  },
  {
    name: 'Board Member 2',
    title: 'Vice President',
    company: 'Company Name',
    linkedin: 'linkedin-username',
    image: '/images/board/placeholder-2.jpg',
  },
  // Add more board members as needed
];

export const STATS = [
  { value: CHAPTER.stats.members, label: 'Members' },
  { value: CHAPTER.stats.eventsPerYear, label: 'Events per year' },
  { value: CHAPTER.stats.yearsActive, label: 'Years of community' },
];
