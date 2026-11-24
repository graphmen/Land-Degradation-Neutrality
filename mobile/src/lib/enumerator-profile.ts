import { Preferences } from "@capacitor/preferences";

export interface EnumeratorProfile {
  enumeratorName: string;
  team: string;
  province: string;
  district: string;
  ward: string;
  apiBaseUrl: string;
}

const STORAGE_KEY = "ema_ldn_enumerator_profile_v1";

export const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_TELEMETRY_URL ||
  "http://localhost:3001";

export const ZIMBABWE_PROVINCE_DISTRICTS: Record<string, string[]> = {
  Bulawayo: ["Bulawayo"],
  Harare: ["Harare", "Chitungwiza", "Epworth"],
  Manicaland: ["Buhera", "Chimanimani", "Chipinge", "Makoni", "Mutare", "Mutasa", "Nyanga"],
  "Mashonaland Central": [
    "Bindura",
    "Mbire",
    "Guruve",
    "Mazowe",
    "Mount Darwin",
    "Rushinga",
    "Shamva",
    "Muzarabani",
  ],
  "Mashonaland East": [
    "Chikomba",
    "Goromonzi",
    "Hwedza",
    "Marondera",
    "Mudzi",
    "Murehwa",
    "Mutoko",
    "Seke",
    "Uzumba-Maramba-Pfungwe",
  ],
  "Mashonaland West": [
    "Chegutu",
    "Hurungwe",
    "Kariba",
    "Makonde",
    "Mhondoro-Ngezi",
    "Sanyati",
    "Zvimba",
  ],
  Masvingo: ["Bikita", "Chiredzi", "Chivi", "Gutu", "Masvingo", "Mwenezi", "Zaka"],
  "Matabeleland North": [
    "Binga",
    "Bubi",
    "Hwange",
    "Lupane",
    "Nkayi",
    "Tsholotsho",
    "Umguza",
  ],
  "Matabeleland South": [
    "Beitbridge",
    "Bulilima",
    "Mangwe",
    "Gwanda",
    "Insiza",
    "Matobo",
    "Umzingwane",
  ],
  Midlands: [
    "Chirumhanzu",
    "Gokwe North",
    "Gokwe South",
    "Gweru",
    "Kwekwe",
    "Mberengwa",
    "Shurugwi",
    "Zvishavane",
  ],
};

export const EMPTY_PROFILE: EnumeratorProfile = {
  enumeratorName: "",
  team: "",
  province: "",
  district: "",
  ward: "",
  apiBaseUrl: DEFAULT_API_BASE_URL,
};

export async function loadEnumeratorProfile(): Promise<EnumeratorProfile> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      return { ...EMPTY_PROFILE, ...(JSON.parse(value) as Partial<EnumeratorProfile>) };
    }
  } catch {
    // Fallback to localStorage on web preview
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<EnumeratorProfile>) };
    }
  } catch {
    // ignore
  }
  return { ...EMPTY_PROFILE };
}

export async function saveEnumeratorProfile(profile: EnumeratorProfile): Promise<void> {
  const payload = JSON.stringify(profile);
  try {
    await Preferences.set({ key: STORAGE_KEY, value: payload });
  } catch {
    // ignore
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // ignore
  }
}
