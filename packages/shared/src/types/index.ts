import type { UserRole, AgreementStatus, BenefitCategory, UnitType, Period, UnionMemberRole } from '../constants';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Union {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CollectiveAgreement {
  id: string;
  union_id: string;
  title: string;
  status: AgreementStatus;
  access_code: string | null;
  document_url: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Benefit {
  id: string;
  agreement_id: string;
  name: string;
  description: string | null;
  category: BenefitCategory;
  unit_type: UnitType;
  limit_amount: number | null;
  period: Period;
  eligibility_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MemberAgreement {
  id: string;
  user_id: string;
  agreement_id: string;
  joined_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  benefit_id: string;
  amount: number;
  used_on: string;
  note: string | null;
  created_at: string;
}

export interface UnionMembership {
  id: string;
  user_id: string;
  union_id: string;
  role: UnionMemberRole;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UsageSummary {
  benefit_id: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  percent_used: number | null;
}
