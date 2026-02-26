export const UserRole = {
  MEMBER: 'member',
  UNION_ADMIN: 'union_admin',
  PLATFORM_ADMIN: 'platform_admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AgreementStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PUBLIC_APPROVED: 'public_approved',
} as const;
export type AgreementStatus = (typeof AgreementStatus)[keyof typeof AgreementStatus];

export const BenefitCategory = {
  LEAVE: 'leave',
  HEALTH: 'health',
  FINANCIAL: 'financial',
  PROFESSIONAL_DEVELOPMENT: 'professional_development',
  WORKPLACE: 'workplace',
  OTHER: 'other',
} as const;
export type BenefitCategory = (typeof BenefitCategory)[keyof typeof BenefitCategory];

export const UnitType = {
  HOURS: 'hours',
  DAYS: 'days',
  WEEKS: 'weeks',
  DOLLARS: 'dollars',
  COUNT: 'count',
} as const;
export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export const Period = {
  PER_MONTH: 'per_month',
  PER_YEAR: 'per_year',
  PER_OCCURRENCE: 'per_occurrence',
  UNLIMITED: 'unlimited',
} as const;
export type Period = (typeof Period)[keyof typeof Period];

export const UnionMemberRole = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const;
export type UnionMemberRole = (typeof UnionMemberRole)[keyof typeof UnionMemberRole];
