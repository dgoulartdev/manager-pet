import type { PatientDto } from '@meupaciente/shared';

const SEX_LABELS: Record<string, string> = { MALE: 'Macho', FEMALE: 'Fêmea' };
const PERSON_TITLES = new Set(['dr', 'dra', 'dr.', 'dra.']);

/** "Gato · SRD · Fêmea" — só as partes preenchidas. */
export function describePatient(patient: Pick<PatientDto, 'species' | 'breed' | 'sex'>): string {
  return [patient.species, patient.breed, SEX_LABELS[patient.sex]].filter(Boolean).join(' · ');
}

/** Idade a partir de YYYY-MM-DD: "3 anos", "8 meses", "menos de 1 mês". */
export function formatAge(birthDate: string | null, today = new Date()): string | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  let months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  if (today.getDate() < day) months -= 1;
  if (months < 0) return null;
  if (months < 1) return 'menos de 1 mês';
  if (months < 12) return months === 1 ? '1 mês' : `${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 ano' : `${years} anos`;
}

/** Telefone brasileiro com DDD: "(11) 99999-8888". Outros formatos ficam como vieram. */
export function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

/** Duas letras para o avatar: "Dra. Ana Lima" → "AL", "Miso" → "MI". */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !PERSON_TITLES.has(word.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Primeiro nome sem título: "Dra. Ana Lima" → "Ana". */
export function firstNameOf(name: string): string {
  return name.split(/\s+/).find((word) => word && !PERSON_TITLES.has(word.toLowerCase())) ?? name;
}

export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : plural}`;
}
