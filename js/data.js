// --------- Data ---------
const VALVES = {
  "15": { id:"15", label:"15 Series (Black Wire)", Cv: 0.245 },
  "24": { id:"24", label:"24 Series (Blue Wire)",  Cv: 0.38  },
};

// Extended nozzle list incl. 1.25 and 3.00 (Black by rule for 3.00)
const BASE_NOZZLES = [
  { code:"01",  color:"Orange",     size:0.10 },
  { code:"015", color:"Green",      size:0.15 },
  { code:"02",  color:"Yellow",     size:0.20 },
  { code:"025", color:"Lilac",      size:0.25 },
  { code:"03",  color:"Blue",       size:0.30 },
  { code:"035", color:"Brown Red",  size:0.35 },
  { code:"04",  color:"Red",        size:0.40 },
  { code:"05",  color:"Brown",      size:0.50 },
  { code:"06",  color:"Gray",       size:0.60 },
  { code:"08",  color:"White",      size:0.80 },
  { code:"10",  color:"Light Blue", size:1.00 },
  { code:"125", color:"Teal",       size:1.25 },
  { code:"15",  color:"Light Green",size:1.50 },
  { code:"20",  color:"Black",      size:2.00 },
  { code:"30",  color:"Black",      size:3.00 }
];

const COLOR_MAP = {
  "Orange":"#F97316","Green":"#16A34A","Yellow":"#EAB308","Lilac":"#C084FC","Blue":"#2563EB","Brown Red":"#9A3412",
  "Red":"#DC2626","Brown":"#92400E","Gray":"#6B7280","White":"#FFFFFF","Light Blue":"#38BDF8","Light Green":"#86EFAC",
  "Black":"#111827","Teal":"#0E5866"
};

const PRESSURE_RULES = {
  field:   { pnIdeal:[30,50], recMax:60, absMax:80, min:null },
  turf:    { pnIdeal:[30,50], recMax:60, absMax:80, min:null },
  orchard: { pnIdeal:[100,160], recMax:180, absMax:180, min:100 },
};

// ---- NEW: Orifice Disk catalog (size = GPM @ 40psi, water)
const ORIFICE_DISKS = [
  { id:"CP4916-008", size:0.008 }, { id:"CP4916-10", size:0.013 },
  { id:"CP4916-12", size:0.019 }, { id:"CP4916-14", size:0.025 },
  { id:"CP4916-15", size:0.029 }, { id:"CP4916-16", size:0.033 },
  { id:"CP4916-18", size:0.042 }, { id:"CP4916-20", size:0.052 },
  { id:"CP4916-22", size:0.061 }, { id:"CP4916-24", size:0.074 },
  { id:"CP4916-25", size:0.079 }, { id:"CP4916-26", size:0.086 },
  { id:"CP4916-27", size:0.091 }, { id:"CP4916-28", size:0.098 },
  { id:"CP4916-29", size:0.108 }, { id:"CP4916-30", size:0.114 },
  { id:"CP4916-31", size:0.123 }, { id:"CP4916-32", size:0.135 },
  { id:"CP4916-34", size:0.147 }, { id:"CP4916-35", size:0.157 },
  { id:"CP4916-37", size:0.172 }, { id:"CP4916-39", size:0.191 },
  { id:"CP4916-40", size:0.204 }, { id:"CP4916-41", size:0.211 },
  { id:"CP4916-43", size:0.231 }, { id:"CP4916-45", size:0.25  },
  { id:"CP4916-46", size:0.27  }, { id:"CP4916-47", size:0.275 },
  { id:"CP4916-48", size:0.286 }, { id:"CP4916-49", size:0.295 },
  { id:"CP4916-51", size:0.329 }, { id:"CP4916-52", size:0.335 },
  { id:"CP4916-54", size:0.36  }, { id:"CP4916-55", size:0.377 },
  { id:"CP4916-57", size:0.4   }, { id:"CP4916-59", size:0.433 },
  { id:"CP4916-61", size:0.466 }, { id:"CP4916-63", size:0.491 },
  { id:"CP4916-65", size:0.522 }, { id:"CP4916-67", size:0.555 },
  { id:"CP4916-68", size:0.573 }, { id:"CP4916-70", size:0.612 },
  { id:"CP4916-72", size:0.64  }, { id:"CP4916-73", size:0.66  },
  { id:"CP4916-75", size:0.694 }, { id:"CP4916-78", size:0.77  },
  { id:"CP4916-80", size:0.793 }, { id:"CP4916-81", size:0.821 },
  { id:"CP4916-83", size:0.897 }, { id:"CP4916-86", size:0.939 },
  { id:"CP4916-89", size:0.98  }, { id:"CP4916-91", size:1.05  },
  { id:"CP4916-93", size:1.09  }, { id:"CP4916-95", size:1.14  },
  { id:"CP4916-98", size:1.25  }, { id:"CP4916-103",size:1.31  },
  { id:"CP4916-107",size:1.47  }, { id:"CP4916-110",size:1.55  },
  { id:"CP4916-115",size:1.71  }, { id:"CP4916-120",size:1.78  },
  { id:"CP4916-125",size:1.96  }, { id:"CP4916-128",size:2.04  },
  { id:"CP4916-132",size:2.19  }, { id:"CP4916-136",size:2.38  },
  { id:"CP4916-140",size:2.53  }, { id:"CP4916-144",size:2.62  },
  { id:"CP4916-147",size:2.7   }, { id:"CP4916-151",size:2.94  },
  { id:"CP4916-156",size:3.11  }, { id:"CP4916-161",size:3.27  },
  { id:"CP4916-166",size:3.43  }, { id:"CP4916-170",size:3.69  },
  { id:"CP4916-172",size:3.84  }, { id:"CP4916-177",size:4.00  },
  { id:"CP4916-182",size:4.17  }, { id:"CP4916-187",size:4.41  },
  { id:"CP4916-196",size:4.90  }, { id:"CP4916-205",size:5.31  },
  { id:"CP4916-218",size:5.96  }, { id:"CP4916-234",size:6.94  },
  { id:"CP4916-250",size:8.00  },
];
