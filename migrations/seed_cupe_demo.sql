-- Seed script: Populate CUPE Local 1234 demo agreement with comprehensive data
-- Agreement ID: 16a0ae3141e7483ab2f98142e1efb30a

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATE EXISTING BENEFITS with enhanced extracted data
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Annual Sick Leave (ed273325411c489f8ccdfbda55bd5d77)
UPDATE benefits SET
  description = 'Paid sick days per calendar year for illness or injury',
  eligibility_notes = 'Available to all permanent and full-time employees who have completed their probationary period of three (3) months.',
  clause_text = 'Each employee shall be entitled to fifteen (15) days of sick leave with pay per calendar year. Sick leave shall accumulate at the rate of one and one-quarter (1.25) days per month of active service. Unused sick leave credits shall be carried forward from year to year to a maximum accumulation of one hundred and twenty (120) days. The Employer may require a medical certificate for absences of three (3) or more consecutive working days.',
  plain_english = 'You get 15 paid sick days each year, building up at about 1.25 days per month. Any unused days carry over to next year, up to a maximum bank of 120 days. If you''re off sick for 3 or more days in a row, your employer can ask for a doctor''s note.',
  claim_process = 'Notify your supervisor by phone or email before your shift begins. For absences of 3+ consecutive days, submit a medical certificate to HR within 5 business days of returning to work. Log your sick day usage through the employee portal or by submitting Form HR-201.',
  clause_reference = 'Article 18.01 - 18.04'
WHERE id = 'ed273325411c489f8ccdfbda55bd5d77';

-- 2. Health Spending Account (ec815f5a811f46efb36af45cfd924a8f)
UPDATE benefits SET
  description = 'Annual health spending account for eligible medical expenses',
  eligibility_notes = 'Available to all permanent employees who have completed six (6) months of continuous service.',
  clause_text = 'The Employer shall provide each eligible employee with a Health Spending Account (HSA) in the amount of one thousand five hundred dollars ($1,500.00) per benefit year. The HSA may be used to reimburse eligible medical and dental expenses as defined by the Canada Revenue Agency. Unused balances may be carried forward for one (1) additional benefit year only. Claims must be submitted within ninety (90) days of the end of the benefit year.',
  plain_english = 'You get $1,500 each year to spend on medical and dental costs that aren''t covered by your regular benefits plan. This includes things like glasses, physiotherapy, dental work, and prescriptions. You can carry over unused money for one extra year, but after that it''s gone. Submit your receipts within 90 days of year-end.',
  claim_process = 'Submit receipts through the Sun Life online portal or mobile app. Include the original receipt showing the date of service, provider name, and amount paid. Claims are typically processed within 10 business days. For questions, contact Sun Life at 1-800-361-6212 quoting Group Policy #12345.',
  clause_reference = 'Article 24.03'
WHERE id = 'ec815f5a811f46efb36af45cfd924a8f';

-- 3. Bereavement Leave (58debedfe09d4fb2949d053099692711)
UPDATE benefits SET
  description = 'Paid leave upon the death of a family member',
  eligibility_notes = 'Available to all employees regardless of tenure or employment type.',
  clause_text = 'An employee shall be granted bereavement leave with pay for a period of up to five (5) working days in the event of the death of the employee''s spouse, common-law partner, child, parent, sibling, grandparent, or grandchild. An employee shall be granted bereavement leave with pay for a period of up to three (3) working days in the event of the death of the employee''s father-in-law, mother-in-law, brother-in-law, or sister-in-law. At the discretion of the Employer, up to two (2) additional days of unpaid leave may be granted for travel purposes.',
  plain_english = 'If an immediate family member passes away (spouse, child, parent, sibling, grandparent, or grandchild), you get up to 5 paid days off. For in-laws, you get up to 3 paid days. If you need to travel, your employer may approve up to 2 extra unpaid days.',
  claim_process = 'Notify your supervisor immediately and provide the name and relationship of the deceased. Upon return, submit a completed Bereavement Leave Request form (HR-305) to Human Resources along with supporting documentation such as a death certificate or obituary notice.',
  clause_reference = 'Article 19.01 - 19.03'
WHERE id = '58debedfe09d4fb2949d053099692711';


-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD NEW BENEFITS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 4. Vacation Leave
INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, clause_text, plain_english, claim_process, clause_reference, sort_order)
VALUES (
  'a1b2c3d4e5f647a8b9c0d1e2f3a4b5c6',
  '16a0ae3141e7483ab2f98142e1efb30a',
  'Vacation Leave',
  'Annual paid vacation entitlement based on years of continuous service',
  'leave',
  'days',
  15,
  'per_year',
  'Entitlement increases with tenure. Employees with less than 5 years service receive 15 days; 5-14 years receive 20 days; 15+ years receive 25 days.',
  'Annual vacation entitlement shall be as follows: (a) An employee with less than five (5) years of continuous service shall be entitled to fifteen (15) working days of vacation with pay per year. (b) An employee with five (5) or more but less than fifteen (15) years of continuous service shall be entitled to twenty (20) working days of vacation with pay per year. (c) An employee with fifteen (15) or more years of continuous service shall be entitled to twenty-five (25) working days of vacation with pay per year. Vacation requests must be submitted at least two (2) weeks in advance and are subject to operational requirements.',
  'You start with 15 vacation days per year. After 5 years you get 20 days, and after 15 years you get 25 days. You need to request your vacation at least 2 weeks ahead of time, and your manager needs to approve it based on staffing needs.',
  'Submit vacation requests through the employee self-service portal at least 14 calendar days before the requested start date. Your supervisor will respond within 5 business days. Vacation scheduling conflicts are resolved by seniority. Unused vacation cannot be carried over beyond March 31 of the following year without written approval from the Department Head.',
  'Article 17.01 - 17.06',
  3
);

-- 5. Dental Coverage
INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, clause_text, plain_english, claim_process, clause_reference, sort_order)
VALUES (
  'b2c3d4e5f6a748b9c0d1e2f3a4b5c6d7',
  '16a0ae3141e7483ab2f98142e1efb30a',
  'Dental Coverage',
  'Annual dental plan covering preventive, basic, and major dental services',
  'health',
  'dollars',
  2500,
  'per_year',
  'Available to all permanent employees and their dependents after completing three (3) months of continuous service.',
  'The Employer shall provide a dental plan for eligible employees and their dependents. The plan shall cover: (a) Preventive and diagnostic services at one hundred percent (100%) of the current ODA Fee Guide; (b) Basic restorative services at eighty percent (80%) of the current ODA Fee Guide; (c) Major restorative services including crowns, bridges, and dentures at fifty percent (50%) of the current ODA Fee Guide, to a combined annual maximum of two thousand five hundred dollars ($2,500.00) per covered person. Orthodontic services for dependent children under age 18 shall be covered at fifty percent (50%) to a lifetime maximum of three thousand dollars ($3,000.00).',
  'Your dental plan covers cleanings and check-ups at 100%, fillings and extractions at 80%, and major work like crowns and dentures at 50%. The annual maximum is $2,500 per person. Kids under 18 can get braces covered at 50% up to a $3,000 lifetime max.',
  'Present your Sun Life benefits card at the dentist. Most dental offices will submit claims directly. For manual claims, submit Form DC-100 with an itemised receipt to Sun Life within 12 months of the date of service. Pre-determination is recommended for any treatment expected to exceed $500.',
  'Article 23.02',
  4
);

-- 6. Professional Development
INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, clause_text, plain_english, claim_process, clause_reference, sort_order)
VALUES (
  'c3d4e5f6a7b849c0d1e2f3a4b5c6d7e8',
  '16a0ae3141e7483ab2f98142e1efb30a',
  'Professional Development Fund',
  'Annual allowance for courses, conferences, and professional certifications',
  'financial',
  'dollars',
  2000,
  'per_year',
  'Available to permanent full-time employees who have completed twelve (12) months of continuous service. Part-time employees receive a pro-rated amount.',
  'The Employer shall provide an annual Professional Development Fund of up to two thousand dollars ($2,000.00) per full-time employee for the purpose of attending conferences, workshops, seminars, or courses related to the employee''s current position or career development within the organization. Part-time employees shall receive a pro-rated amount based on their regular hours. Requests must be pre-approved by the employee''s supervisor and the Department Head. Approved professional development activities occurring during regular working hours shall be considered time worked.',
  'You get up to $2,000 per year for work-related training, courses, conferences, or certifications. Part-time staff get a proportional amount. You need your supervisor''s approval before signing up. If the training falls during work hours, it counts as work time — you don''t lose pay.',
  'Submit a Professional Development Request form (HR-410) to your supervisor at least 30 days before the event or course start date. Include the course description, cost breakdown, and how it relates to your role. After completion, submit receipts and a brief summary report within 30 days. Reimbursement is processed through payroll within two pay periods.',
  'Article 22.01 - 22.04',
  5
);

-- 7. Parental Leave Top-Up
INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, clause_text, plain_english, claim_process, clause_reference, sort_order)
VALUES (
  'd4e5f6a7b8c950d1e2f3a4b5c6d7e8f9',
  '16a0ae3141e7483ab2f98142e1efb30a',
  'Parental Leave Top-Up',
  'Employer top-up to Employment Insurance during parental leave',
  'leave',
  'weeks',
  17,
  'per_occurrence',
  'Available to permanent employees who have completed twelve (12) months of continuous service and who are receiving Employment Insurance maternity or parental benefits.',
  'An employee who has completed twelve (12) months of continuous service and who is receiving Employment Insurance (EI) maternity or parental benefits shall receive a top-up payment equal to the difference between the EI benefit and ninety-three percent (93%) of the employee''s regular weekly salary, for a maximum period of seventeen (17) weeks. The employee must provide proof of EI benefit entitlement. The employee shall agree in writing to return to work for a period of at least six (6) months following the leave; failing which, the employee shall repay the top-up amount on a pro-rated basis.',
  'When you go on parental leave, the employer tops up your EI payments so you receive 93% of your normal pay for up to 17 weeks. You need to have worked here for at least 12 months and be receiving EI benefits. You also need to commit to returning to work for at least 6 months afterwards — otherwise you may need to pay back some or all of the top-up.',
  'Submit your Parental Leave Application (HR-500) to Human Resources at least four (4) weeks before your expected leave start date. Include a copy of your EI benefit statement showing your weekly benefit rate. HR will calculate the top-up amount and process payments through regular payroll. Sign the Return to Work Agreement (HR-501) before top-up payments begin.',
  'Article 20.05 - 20.08',
  6
);

-- 8. Overtime Pay
INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, clause_text, plain_english, claim_process, clause_reference, sort_order)
VALUES (
  'e5f6a7b8c9d051e2f3a4b5c6d7e8f9a0',
  '16a0ae3141e7483ab2f98142e1efb30a',
  'Overtime Pay',
  'Premium pay rate for hours worked beyond regular schedule',
  'financial',
  'hours',
  NULL,
  'unlimited',
  'Available to all non-management employees. Must be pre-authorised by supervisor.',
  'All authorised work performed in excess of the regular daily or weekly hours of work shall be compensated at the following overtime rates: (a) Time and one-half (1.5x) for the first four (4) hours of overtime in any day; (b) Double time (2.0x) for all overtime hours in excess of four (4) hours in any day and for all hours worked on a designated paid holiday. An employee may elect to receive compensatory time off in lieu of overtime pay, at the applicable overtime rate, to a maximum accumulation of five (5) days. Compensatory time must be used within six (6) months or it shall be paid out.',
  'When you work overtime, you get paid 1.5x your normal rate for the first 4 extra hours, and 2x after that. Working on a holiday is always double time. Instead of extra pay, you can choose to bank the time as days off (up to 5 days), but you need to use them within 6 months or they get paid out.',
  'Overtime must be pre-approved by your supervisor. Record overtime hours on your timesheet indicating the authorising supervisor. Overtime is paid on the regular pay cycle. To request compensatory time off instead of pay, indicate "CTO" on your timesheet and submit a Time Off Request when you wish to use banked time.',
  'Article 16.01 - 16.05',
  7
);

-- 9. Personal Leave Days
INSERT INTO benefits (id, agreement_id, name, description, category, unit_type, limit_amount, period, eligibility_notes, clause_text, plain_english, claim_process, clause_reference, sort_order)
VALUES (
  'f6a7b8c9d0e152f3a4b5c6d7e8f9a0b1',
  '16a0ae3141e7483ab2f98142e1efb30a',
  'Personal Leave Days',
  'Discretionary paid personal days for appointments and personal matters',
  'leave',
  'days',
  3,
  'per_year',
  'Available to all permanent employees. Cannot be carried over to the next calendar year.',
  'Each permanent employee shall be entitled to three (3) personal leave days with pay per calendar year, to be used for personal matters such as medical appointments, legal proceedings, moving, or other personal obligations. Personal leave days shall not accumulate from year to year. Requests for personal leave shall be made to the employee''s supervisor with as much advance notice as practicable. Personal leave days may be taken in half-day increments.',
  'You get 3 personal days each year for things like appointments, moving house, or other personal matters. These don''t carry over — use them or lose them by December 31. You can take half days too. Just give your supervisor as much notice as you can.',
  'Submit a Personal Leave Request through the employee portal or notify your supervisor by email. Provide at least 24 hours notice when possible. No documentation is required. These days are tracked automatically in the attendance system.',
  'Article 19.05',
  8
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- ADD ELIGIBILITY RULES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Annual Sick Leave: requires 3+ months tenure (probationary period)
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r001a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'ed273325411c489f8ccdfbda55bd5d77',
  'tenure_months', 'gte', '3',
  '3+ months tenure required (probationary period)'
);
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r002a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'ed273325411c489f8ccdfbda55bd5d77',
  'employment_type', 'neq', 'casual',
  'Not available to casual employees'
);

-- Health Spending Account: requires 6+ months tenure
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r003a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'ec815f5a811f46efb36af45cfd924a8f',
  'tenure_months', 'gte', '6',
  '6+ months continuous service required'
);
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r004a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'ec815f5a811f46efb36af45cfd924a8f',
  'employment_type', 'neq', 'casual',
  'Permanent employees only'
);

-- Dental Coverage: requires 3+ months
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r005a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'b2c3d4e5f6a748b9c0d1e2f3a4b5c6d7',
  'tenure_months', 'gte', '3',
  '3+ months continuous service required'
);
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r006a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'b2c3d4e5f6a748b9c0d1e2f3a4b5c6d7',
  'employment_type', 'neq', 'casual',
  'Permanent employees only'
);

-- Professional Development: requires 12+ months, full-time
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r007a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'c3d4e5f6a7b849c0d1e2f3a4b5c6d7e8',
  'tenure_months', 'gte', '12',
  '12+ months continuous service required'
);
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r008a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'c3d4e5f6a7b849c0d1e2f3a4b5c6d7e8',
  'employment_type', 'eq', 'full_time',
  'Full-time employees only (part-time receive pro-rated amount)'
);

-- Parental Leave Top-Up: requires 12+ months, permanent
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r009a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'd4e5f6a7b8c950d1e2f3a4b5c6d7e8f9',
  'tenure_months', 'gte', '12',
  '12+ months continuous service required'
);
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r010a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'd4e5f6a7b8c950d1e2f3a4b5c6d7e8f9',
  'employment_type', 'neq', 'casual',
  'Permanent employees only'
);

-- Personal Leave Days: permanent employees only
INSERT INTO benefit_eligibility_rules (id, benefit_id, key, operator, value, label)
VALUES (
  'r011a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
  'f6a7b8c9d0e152f3a4b5c6d7e8f9a0b1',
  'employment_type', 'neq', 'casual',
  'Permanent employees only'
);

-- Bereavement Leave and Overtime: NO eligibility rules (available to all)
