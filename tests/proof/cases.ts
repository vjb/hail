// Labeled proof set for verify-v2 (npm run eval:proof). Each case is one submission: the task, the
// photos with the code each was asked to show, and what Hail must do with it.
//   pay           honest, complete proof → auto-pass, every item met
//   pay_unmet     honest proof that the item doesn't match → auto-pass, an item not met (worker paid)
//   reject        the proof doesn't show what was asked → fail
//   no_autopay    fake or doubtful proof → anything but pass (fail or owner review)
// The gate is zero auto-paid fakes: a no_autopay or reject case that comes out "pass" fails it.
//
// Photo sources:
//   e2e:<name>        e2e/photos (AI-generated sample photos, HH-010) — all of them are fakes here
//   real:<name>       tests/proof/photos/<name>.jpg — real phone photos, kept out of the public repo
//   gen:<file>        tests/proof/generated/<file> — Nano Banana (Gemini) images made to look like
//                     real proof, photo code included (D-029). "-c2pa.png" keeps Google's Content
//                     Credentials; the .jpg copies are re-saved, as a cheater would, so they carry none.
//   synth:<kind>:<e2e name>  built at run time from a sample photo (screen = shown on a monitor;
//                     overlay = the code pasted on digitally)

export type Expect = "pay" | "pay_unmet" | "reject" | "no_autopay";
export type ProofPhoto = { src: string; label: string; code: string | null; /** How it reached Hail; default "camera" (in-app). Generated files can only arrive as "file". */ source?: "camera" | "file" };
export type ProofCase = { id: string; note: string; title: string; instructions: string; checklist: string[]; photos: ProofPhoto[]; expect: Expect };

const espresso = {
  title: "Inspect a used espresso machine",
  instructions: "At the shop's display, photograph the espresso machine's serial number plate and its front panel with the power light on.",
  checklist: ["The serial number is legible", "The machine is visibly powered on"],
};

const appliance = {
  title: "Check an appliance before purchase",
  instructions: "Photograph the appliance's model and serial label, and the appliance from the front while it's switched on.",
  checklist: ["The model and serial label is legible", "The appliance is visibly switched on"],
};


const usedBike = {
  title: "Check a used road bike before purchase",
  instructions: "Meet the seller on the sidewalk. Photograph the frame serial number under the bottom bracket, and the whole bike.",
  checklist: ["The frame serial number is legible", "The whole bike is visible"],
};

export const CASES: ProofCase[] = [
  // --- Real phone photos (the human takes these; see README "Proof eval") ---
  {
    id: "R1",
    note: "Real photos, both codes on paper in the shot",
    ...appliance,
    photos: [
      { src: "real:label-code", label: "Model and serial label", code: "KTR-482" },
      { src: "real:front-code", label: "The appliance from the front, switched on", code: "MVD-736" },
    ],
    expect: "pay",
  },
  {
    id: "R2",
    note: "Same real photos; the listing claims a serial they can't have → honest mismatch, worker still paid",
    ...appliance,
    checklist: [...appliance.checklist, "The serial number is ZZ-0000000"],
    photos: [
      { src: "real:label-code", label: "Model and serial label", code: "KTR-482" },
      { src: "real:front-code", label: "The appliance from the front, switched on", code: "MVD-736" },
    ],
    expect: "pay_unmet",
  },
  {
    id: "R3",
    note: "Real label photo without the paper code",
    ...appliance,
    checklist: [appliance.checklist[0]],
    photos: [{ src: "real:label-nocode", label: "Model and serial label", code: "KTR-482" }],
    expect: "no_autopay",
  },
  {
    id: "R4",
    note: "The real label photo shown on a screen and photographed",
    ...appliance,
    checklist: [appliance.checklist[0]],
    photos: [{ src: "real:label-screen", label: "Model and serial label", code: "KTR-482" }],
    expect: "no_autopay",
  },
  {
    id: "R5",
    note: "Real label photo with the code, deliberately blurry",
    ...appliance,
    checklist: [appliance.checklist[0]],
    photos: [{ src: "real:label-blurry", label: "Model and serial label", code: "KTR-482" }],
    expect: "reject",
  },
  {
    id: "R6",
    note: "Real label photo answering a different code (an old photo reused)",
    ...appliance,
    checklist: [appliance.checklist[0]],
    photos: [{ src: "real:label-code", label: "Model and serial label", code: "HXP-947" }],
    expect: "no_autopay",
  },

  // --- AI-generated sample photos: never auto-paid ---
  {
    id: "G1",
    note: "Generated photos, codes requested (and absent)",
    ...espresso,
    photos: [
      { src: "e2e:good-1", label: "Serial number plate", code: "KTR-482" },
      { src: "e2e:good-2", label: "Front panel with power light on", code: "MVD-736" },
    ],
    expect: "no_autopay",
  },
  {
    id: "G2",
    note: "Generated photos, no codes issued",
    ...espresso,
    photos: [
      { src: "e2e:good-1", label: "Serial number plate", code: null },
      { src: "e2e:good-2", label: "Front panel with power light on", code: null },
    ],
    expect: "no_autopay",
  },
  {
    id: "G3",
    note: "Generated, blurry plate",
    ...espresso,
    checklist: [espresso.checklist[0]],
    photos: [{ src: "e2e:bad-1", label: "Serial number plate", code: null }],
    expect: "no_autopay",
  },
  {
    id: "G4",
    note: "Generated, wrong kind of machine (drip coffee maker)",
    ...espresso,
    photos: [
      { src: "e2e:bad-2", label: "Serial number plate", code: null },
      { src: "e2e:good-2", label: "Front panel with power light on", code: null },
    ],
    expect: "no_autopay",
  },

  // --- Synthetic fakes built from a sample photo ---
  {
    id: "S1",
    note: "Sample photo shown on a monitor",
    ...espresso,
    checklist: [espresso.checklist[0]],
    photos: [{ src: "synth:screen:good-1", label: "Serial number plate", code: "KTR-482" }],
    expect: "no_autopay",
  },
  {
    id: "S2",
    note: "The requested code pasted onto the photo digitally",
    ...espresso,
    checklist: [espresso.checklist[0]],
    photos: [{ src: "synth:overlay:good-1", label: "Serial number plate", code: "KTR-482" }],
    expect: "no_autopay",
  },

  // --- Nano Banana fakes made to pass: realistic photos with the right code on paper ---
  {
    id: "N1",
    note: "Generated bike serial + whole bike, correct codes, re-saved (no Content Credentials)",
    ...usedBike,
    photos: [
      { source: "file", src: "gen:bike-serial-code.jpg", label: "Frame serial number", code: "KTR-482" },
      { source: "file", src: "gen:bike-whole-code.jpg", label: "The whole bike", code: "MVD-736" },
    ],
    expect: "no_autopay",
  },
  {
    id: "N2",
    note: "Generated Times Square scout, correct code, re-saved",
    title: "How busy is Times Square right now?",
    instructions: "From the red steps at Father Duffy Square, take one wide photo showing the crowd.",
    checklist: ["The square and its crowd are visible"],
    photos: [{ source: "file", src: "gen:times-square-code.jpg", label: "Wide photo of the square", code: "HXP-947" }],
    expect: "no_autopay",
  },
  {
    id: "N3",
    note: "Generated bike serial straight from Gemini, Content Credentials intact",
    ...usedBike,
    checklist: [usedBike.checklist[0]],
    photos: [{ source: "file", src: "gen:bike-serial-code-c2pa.png", label: "Frame serial number", code: "KTR-482" }],
    expect: "no_autopay",
  },
];
