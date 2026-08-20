type Segment = {
    token: string;
    value: number;
    isDouble: boolean;
  };
  
  const NUMBER_ORDER = [
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  ];
  
  export const PREFERRED_ROUTES: Record<number, string[]> = {
    170: ["T20", "T20", "DBULL"],
    167: ["T20", "T19", "DBULL"],
    164: ["T20", "T18", "DBULL"],
    161: ["T20", "T17", "DBULL"],
    160: ["T20", "T20", "D20"],
    158: ["T20", "T20", "D19"],
    157: ["T20", "T19", "D20"],
    156: ["T20", "T20", "D18"],
    155: ["T20", "T19", "D19"],
    154: ["T20", "T18", "D20"],
    153: ["T20", "T19", "D18"],
    152: ["T20", "T20", "D16"],
    151: ["T20", "T17", "D20"],
    150: ["T20", "T18", "D18"],
    149: ["T20", "T19", "D16"],
    148: ["T20", "T16", "D20"],
    147: ["T20", "T17", "D18"],
    146: ["T20", "T18", "D16"],
    145: ["T20", "T15", "D20"],
    144: ["T20", "T20", "D12"],
    143: ["T20", "T17", "D16"],
    142: ["T20", "T14", "D20"],
    141: ["T20", "T19", "D12"],
    140: ["T20", "T16", "D16"],
    139: ["T20", "T13", "D20"],
    138: ["T20", "T18", "D12"],
    137: ["T20", "T19", "D10"],
    136: ["T20", "T20", "D8"],
    135: ["T20", "T17", "D12"],
    134: ["T20", "T14", "D16"],
    133: ["T20", "T19", "D8"],
    132: ["T20", "T16", "D12"],
    131: ["T20", "T13", "D16"],
    130: ["T20", "T20", "D5"],
    129: ["T19", "T16", "D12"],
    128: ["T18", "T14", "D16"],
    127: ["T20", "T17", "D8"],
    126: ["T19", "T19", "D6"],
    125: ["25", "T20", "D20"],
    124: ["T20", "T16", "D8"],
    123: ["T19", "T16", "D9"],
    122: ["T18", "T20", "D4"],
    121: ["T17", "T10", "D20"],
    120: ["T20", "20", "D20"],
    119: ["T19", "T12", "D13"],
    118: ["T20", "18", "D20"],
    117: ["T20", "17", "D20"],
    116: ["T20", "16", "D20"],
    115: ["T20", "15", "D20"],
    114: ["T20", "14", "D20"],
    113: ["T20", "13", "D20"],
    112: ["T20", "20", "D16"],
    111: ["T19", "20", "D16"],
    110: ["T20", "18", "D16"],
    109: ["T20", "17", "D16"],
    108: ["T20", "16", "D16"],
    107: ["T19", "18", "D16"],
    106: ["T20", "10", "D18"],
    105: ["T20", "13", "D16"],
    104: ["T18", "18", "D16"],
    103: ["T20", "11", "D16"],
    102: ["T20", "10", "D16"],
    101: ["T17", "18", "D16"],
    100: ["T20", "D20"],
    99: ["T19", "10", "D16"],
    98: ["T20", "D19"],
    97: ["T19", "D20"],
    96: ["T20", "D18"],
    95: ["T19", "D19"],
    94: ["T18", "D20"],
    93: ["T19", "D18"],
    92: ["T20", "D16"],
    91: ["T17", "D20"],
    90: ["T20", "D15"],
    89: ["T19", "D16"],
    88: ["T16", "D20"],
    87: ["T17", "D18"],
    86: ["T18", "D16"],
    85: ["T15", "D20"],
    84: ["T20", "D12"],
    83: ["T17", "D16"],
    82: ["T14", "D20"],
    81: ["T19", "D12"],
    80: ["T20", "D10"],
    79: ["T19", "D11"],
    78: ["T18", "D12"],
    77: ["T19", "D10"],
    76: ["T20", "D8"],
    75: ["T17", "D12"],
    74: ["T14", "D16"],
    73: ["T19", "D8"],
    72: ["T16", "D12"],
    71: ["T13", "D16"],
    70: ["T18", "D8"],
    69: ["T15", "D12"],
    68: ["T20", "D4"],
    67: ["T17", "D8"],
    66: ["T10", "D18"],
    65: ["25", "D20"],
    64: ["T16", "D8"],
    63: ["T13", "D12"],
    62: ["T10", "D16"],
    61: ["T15", "D8"],
    60: ["20", "D20"],
    59: ["19", "D20"],
    58: ["18", "D20"],
    57: ["17", "D20"],
    56: ["16", "D20"],
    55: ["15", "D20"],
    54: ["14", "D20"],
    53: ["13", "D20"],
    52: ["20", "D16"],
    51: ["19", "D16"],
    50: ["18", "D16"],
    49: ["17", "D16"],
    48: ["16", "D16"],
    47: ["15", "D16"],
    46: ["14", "D16"],
    45: ["13", "D16"],
    44: ["12", "D16"],
    43: ["11", "D16"],
    42: ["10", "D16"],
    41: ["9", "D16"],
    40: ["D20"],
    39: ["7", "D16"],
    38: ["D19"],
    37: ["5", "D16"],
    36: ["D18"],
    35: ["3", "D16"],
    34: ["D17"],
    33: ["1", "D16"],
    32: ["D16"],
    31: ["15", "D8"],
    30: ["D15"],
    29: ["13", "D8"],
    28: ["D14"],
    27: ["11", "D8"],
    26: ["D13"],
    25: ["9", "D8"],
    24: ["D12"],
    23: ["7", "D8"],
    22: ["D11"],
    21: ["5", "D8"],
    20: ["D10"],
    19: ["3", "D8"],
    18: ["D9"],
    17: ["1", "D8"],
    16: ["D8"],
    15: ["7", "D4"],
    14: ["D7"],
    13: ["5", "D4"],
    12: ["D6"],
    11: ["3", "D4"],
    10: ["D5"],
    9: ["1", "D4"],
    8: ["D4"],
    7: ["3", "D2"],
    6: ["D3"],
    5: ["1", "D2"],
    4: ["D2"],
    3: ["1", "D1"],
    2: ["D1"],
  };
  
  const SINGLE_SEGMENTS: Segment[] = [
    ...NUMBER_ORDER.map((n) => ({
      token: String(n),
      value: n,
      isDouble: false,
    })),
    { token: "25", value: 25, isDouble: false },
  ];
  
  const TREBLE_SEGMENTS: Segment[] = NUMBER_ORDER.map((n) => ({
    token: `T${n}`,
    value: n * 3,
    isDouble: false,
  }));
  
  const DOUBLE_SEGMENTS: Segment[] = [
    ...NUMBER_ORDER.map((n) => ({
      token: `D${n}`,
      value: n * 2,
      isDouble: true,
    })),
    { token: "DBULL", value: 50, isDouble: true },
  ];
  
  const SCORE_SEGMENTS = [
    ...TREBLE_SEGMENTS,
    ...SINGLE_SEGMENTS,
    ...DOUBLE_SEGMENTS,
  ];
  
  export function searchRoute(score: number): string[] | null {
    if (score < 2 || score > 170) return null;
  
    for (const double of DOUBLE_SEGMENTS) {
      if (double.value === score) {
        return [double.token];
      }
    }
  
    for (const first of SCORE_SEGMENTS) {
      for (const double of DOUBLE_SEGMENTS) {
        if (first.value + double.value === score) {
          return [first.token, double.token];
        }
      }
    }
  
    for (const first of SCORE_SEGMENTS) {
      for (const second of SCORE_SEGMENTS) {
        for (const double of DOUBLE_SEGMENTS) {
          if (
            first.value + second.value + double.value === score
          ) {
            return [first.token, second.token, double.token];
          }
        }
      }
    }
  
    return null;
  }
  
  export function getSuggestedRoute(score: number): string[] {
    const preferred = PREFERRED_ROUTES[score];
  
    if (preferred?.length) {
      return preferred;
    }
  
    return searchRoute(score) ?? [];
  }
  
  function buildPossible3DartScores(): Set<number> {
    const dartValues = new Set<number>([0]);
  
    for (let n = 1; n <= 20; n += 1) {
      dartValues.add(n);
      dartValues.add(n * 2);
      dartValues.add(n * 3);
    }
  
    dartValues.add(25);
    dartValues.add(50);
  
    const values = [...dartValues];
    const possible = new Set<number>();
  
    for (const a of values) {
      for (const b of values) {
        for (const c of values) {
          possible.add(a + b + c);
        }
      }
    }
  
    return possible;
  }
  
  export const POSSIBLE_3DART_SCORES =
    buildPossible3DartScores();
  
  export function getValidCheckoutDartCounts(
    score: number
  ): number[] {
    const route = searchRoute(score);
  
    if (!route) return [];
  
    const minimum = route.length;
  
    return Array.from(
      { length: 4 - minimum },
      (_, index) => minimum + index
    );
  }