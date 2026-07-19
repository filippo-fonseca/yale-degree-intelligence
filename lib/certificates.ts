/**
 * Certificate requirements for Degree Intelligence v3.
 *
 * Data compiled from YCPS catalog:
 * https://catalog.yale.edu/ycps/programs_certificates/
 *
 * Schema mirrors lib/majors.ts so certificate progress can later reuse
 * the same requirement-matching engine. UI / simulator integration is TBD.
 */

import allCertificates from './data/all_certificates.json';

export type CertificateRequirementOption =
  | {
      type: 'course';
      code: string;
    }
  | {
      type: 'group';
      options: string[];
      required: number;
      description?: string;
    };

export type CertificateRequirement = {
  name: string;
  description?: string;
  required: number;
  options: CertificateRequirementOption[];
};

export type Certificate = {
  id: string;
  name: string;
  description?: string;
  category: 'advanced_language' | 'interdisciplinary' | 'skills_based' | string;
  sourceUrl?: string;
  requiresApplication?: boolean;
  parentProgram?: string | null;
  creditRequirements: {
    total: number;
  };
  notes?: string[];
  requirements: CertificateRequirement[];
};

export const CERTIFICATES = allCertificates as Record<string, Certificate>;

export const CERTIFICATE_LIST: Certificate[] = Object.values(CERTIFICATES).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function getCertificate(id: string): Certificate | undefined {
  return CERTIFICATES[id];
}

export function getCertificatesByCategory(
  category: Certificate['category']
): Certificate[] {
  return CERTIFICATE_LIST.filter((c) => c.category === category);
}
