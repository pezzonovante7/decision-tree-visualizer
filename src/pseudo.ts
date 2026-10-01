export type CodeLine = {
  id: string;
  text: string;
  role: "sig" | "line" | "gap";
};

export const CODE: CodeLine[] = [
  { id: "sig", text: "Generate_decision_tree(D, attribute_list)", role: "sig" },
  { id: "g1", text: "(1)   create a node N", role: "line" },
  { id: "g2", text: "(2)   if every tuple in D has class C then", role: "line" },
  { id: "g3", text: "(3)       return N as a leaf labeled C", role: "line" },
  { id: "g4", text: "(4)   if attribute_list is empty then", role: "line" },
  { id: "g5", text: "(5)       return N labeled with the majority class in D", role: "line" },
  { id: "g6", text: "(6)   criterion ← Attribute_selection(D, attribute_list)", role: "line" },
  { id: "g7", text: "(7)   label N with the splitting criterion", role: "line" },
  { id: "g8", text: "(8)   for each outcome j of the criterion", role: "line" },
  { id: "g9", text: "(9)       let Dj be the tuples in D with outcome j", role: "line" },
  { id: "g10", text: "(10)      if Dj is empty then", role: "line" },
  { id: "g11", text: "(11)          attach a leaf with the majority class in D", role: "line" },
  { id: "g12", text: "(12)      else attach Generate_decision_tree(Dj, list − split)", role: "line" },
  { id: "g13", text: "(13)  return N", role: "line" },
  { id: "gap", text: "", role: "gap" },
  { id: "sig2", text: "Attribute_selection — information gain", role: "sig" },
  { id: "a1", text: "Info(D) = − Σ  pᵢ log₂(pᵢ)", role: "line" },
  { id: "a2", text: "for each candidate attribute A", role: "line" },
  { id: "a3", text: "    Info_A(D) = Σ  (|Dⱼ| / |D|) · Info(Dⱼ)", role: "line" },
  { id: "a4", text: "    Gain(A) = Info(D) − Info_A(D)", role: "line" },
  { id: "a5", text: "return the A with the largest Gain(A)", role: "line" },
];
