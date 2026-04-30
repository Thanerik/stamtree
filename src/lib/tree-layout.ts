import type { FamilyPerson, FamilyTreeData } from "./family";

const CARD_WIDTH = 248;
const CARD_MIN_HEIGHT = 286;
const PARTNER_GAP = 24;
const SIBLING_GAP = 42;
const LEVEL_GAP = 110;
const PARTNER_LINE_OFFSET = 18;
const CHILD_BAR_OFFSET = 54;
const CARD_VERTICAL_PADDING = 29;
const CARD_MEDIA_HEIGHT = 215;
const CARD_SECTION_GAP = 14;
const COPY_ROW_GAP = 6;
const COPY_BOTTOM_PADDING = 0;
const TITLE_LINE_HEIGHT = 20;
const BODY_LINE_HEIGHT = 21;
const NOTES_LINE_HEIGHT = 20;
const TITLE_CHARS_PER_LINE = 18;
const BODY_CHARS_PER_LINE = 24;
const NOTES_CHARS_PER_LINE = 28;

export type TreeCardLayout = {
  personId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TreeConnector = {
  points: Array<[number, number]>;
};

export type TreeLayout = {
  width: number;
  height: number;
  cards: TreeCardLayout[];
  connectors: TreeConnector[];
};

type Subtree = TreeLayout & {
  anchorX: number;
  entryAnchors: Record<string, number>;
};

function estimateWrappedLines(text: string, charsPerLine: number) {
  const segments = text
    .split(/\r?\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return 1;
  }

  return segments.reduce((total, segment) => {
    const words = segment.split(/\s+/);
    let lines = 1;
    let lineLength = 0;

    for (const word of words) {
      const wordLength = word.length;

      if (lineLength === 0) {
        lineLength = wordLength;
        continue;
      }

      if (lineLength + 1 + wordLength <= charsPerLine) {
        lineLength += 1 + wordLength;
        continue;
      }

      lines += 1;
      lineLength = wordLength;
    }

    return total + lines;
  }, 0);
}

function estimatePersonCardHeight(person: FamilyPerson) {
  const textRows = [
    {
      lines: estimateWrappedLines(person.fullName, TITLE_CHARS_PER_LINE),
      lineHeight: TITLE_LINE_HEIGHT,
    },
    {
      lines: estimateWrappedLines(`Tegnnavn: ${person.signName}`, BODY_CHARS_PER_LINE),
      lineHeight: BODY_LINE_HEIGHT,
    },
  ];

  if (person.birthDate) {
    if (person.deathDate) {
      textRows.push({
        lines: estimateWrappedLines(`Død 29. sep. 2016 (91 år)`, BODY_CHARS_PER_LINE),
        lineHeight: BODY_LINE_HEIGHT,
      });
      textRows.push({
        lines: estimateWrappedLines(`91 år ved dødsfaldet · 100 år i dag`, BODY_CHARS_PER_LINE),
        lineHeight: BODY_LINE_HEIGHT,
      });
    } else {
      textRows.push({
        lines: estimateWrappedLines(`Født 11. sep. 1925 (100 år)`, BODY_CHARS_PER_LINE),
        lineHeight: BODY_LINE_HEIGHT,
      });
    }
  }

  if (person.notes) {
    textRows.push({
      lines: estimateWrappedLines(person.notes, NOTES_CHARS_PER_LINE),
      lineHeight: NOTES_LINE_HEIGHT,
    });
  }

  const textHeight = textRows.reduce((total, row) => total + row.lines * row.lineHeight, 0);
  const gapsHeight = Math.max(0, textRows.length - 1) * COPY_ROW_GAP;
  const totalHeight =
    CARD_VERTICAL_PADDING +
    CARD_MEDIA_HEIGHT +
    CARD_SECTION_GAP +
    textHeight +
    gapsHeight +
    COPY_BOTTOM_PADDING;

  return Math.max(CARD_MIN_HEIGHT, totalHeight);
}

function collectLevels(groupId: string, tree: FamilyTreeData, level: number, levels: Record<string, number>) {
  const group = tree.groups[groupId];

  if (!group) {
    throw new Error(`Ukendt gruppe "${groupId}" i niveauberegningen.`);
  }

  for (const parentId of group.parents) {
    levels[parentId] = level;
  }

  for (const childId of group.children) {
    levels[childId] = level + 1;

    const nestedGroupId = tree.parentGroupByPerson[childId];
    if (nestedGroupId && nestedGroupId !== groupId) {
      collectLevels(nestedGroupId, tree, level + 1, levels);
    }
  }
}

function buildRowHeights(tree: FamilyTreeData) {
  const levels: Record<string, number> = {};
  collectLevels(tree.rootGroupId, tree, 0, levels);

  const rowHeights: Record<number, number> = {};
  for (const [personId, level] of Object.entries(levels)) {
    const person = tree.people[personId];

    if (!person) {
      continue;
    }

    const estimatedHeight = estimatePersonCardHeight(person);
    rowHeights[level] = Math.max(rowHeights[level] ?? CARD_MIN_HEIGHT, estimatedHeight);
  }

  return rowHeights;
}

function offsetSubtree(subtree: Subtree, offsetX: number, offsetY: number): Subtree {
  return {
    width: subtree.width,
    height: subtree.height,
    anchorX: subtree.anchorX + offsetX,
    entryAnchors: Object.fromEntries(
      Object.entries(subtree.entryAnchors).map(([personId, anchorX]) => [personId, anchorX + offsetX]),
    ),
    cards: subtree.cards.map((card) => ({
      ...card,
      x: card.x + offsetX,
      y: card.y + offsetY,
    })),
    connectors: subtree.connectors.map((connector) => ({
      points: connector.points.map(([x, y]) => [x + offsetX, y + offsetY]),
    })),
  };
}

function layoutLeaf(personId: string, rowHeights: Record<number, number>, level: number): Subtree {
  const cardHeight = rowHeights[level] ?? CARD_MIN_HEIGHT;

  return {
    width: CARD_WIDTH,
    height: cardHeight,
    anchorX: CARD_WIDTH / 2,
    entryAnchors: {
      [personId]: CARD_WIDTH / 2,
    },
    cards: [
      {
        personId,
        x: 0,
        y: 0,
        width: CARD_WIDTH,
        height: cardHeight,
      },
    ],
    connectors: [],
  };
}

function mergeChildSubtrees(subtrees: Subtree[]) {
  if (subtrees.length === 0) {
    return {
      width: 0,
      height: 0,
      entryAnchors: {} as Record<string, number>,
      cards: [] as TreeCardLayout[],
      connectors: [] as TreeConnector[],
    };
  }

  let cursor = 0;
  const cards: TreeCardLayout[] = [];
  const connectors: TreeConnector[] = [];
  const entryAnchors: Record<string, number> = {};
  let maxHeight = 0;

  subtrees.forEach((subtree, index) => {
    if (index > 0) {
      cursor += SIBLING_GAP;
    }

    const shifted = offsetSubtree(subtree, cursor, 0);
    cards.push(...shifted.cards);
    connectors.push(...shifted.connectors);
    Object.assign(entryAnchors, shifted.entryAnchors);
    maxHeight = Math.max(maxHeight, shifted.height);
    cursor += subtree.width;
  });

  return {
    width: cursor,
    height: maxHeight,
    entryAnchors,
    cards,
    connectors,
  };
}

function layoutGroup(groupId: string, tree: FamilyTreeData, rowHeights: Record<number, number>, level: number): Subtree {
  const group = tree.groups[groupId];

  if (!group) {
    throw new Error(`Ukendt gruppe "${groupId}" i layoutberegningen.`);
  }

  const parentWidth =
    group.parents.length * CARD_WIDTH + Math.max(0, group.parents.length - 1) * PARTNER_GAP;

  const childSubtrees = group.children.map((childId) => {
    const nestedGroupId = tree.parentGroupByPerson[childId];

    if (nestedGroupId && nestedGroupId !== groupId) {
      return layoutGroup(nestedGroupId, tree, rowHeights, level + 1);
    }

    return layoutLeaf(childId, rowHeights, level + 1);
  });

  const mergedChildren = mergeChildSubtrees(childSubtrees);
  const width = Math.max(parentWidth, mergedChildren.width || 0);
  const parentStartX = (width - parentWidth) / 2;
  const parentCenterX = parentStartX + parentWidth / 2;
  const parentHeight = rowHeights[level] ?? CARD_MIN_HEIGHT;
  const cards: TreeCardLayout[] = group.parents.map((personId, index) => ({
    personId,
    x: parentStartX + index * (CARD_WIDTH + PARTNER_GAP),
    y: 0,
    width: CARD_WIDTH,
    height: parentHeight,
  }));
  const entryAnchors = Object.fromEntries(
    cards.map((card) => [card.personId, card.x + CARD_WIDTH / 2]),
  );

  const connectors: TreeConnector[] = [];

  const partnerLineY = parentHeight + PARTNER_LINE_OFFSET;
  if (group.parents.length > 1) {
    const firstCenter = cards[0].x + CARD_WIDTH / 2;
    const lastCenter = cards[cards.length - 1].x + CARD_WIDTH / 2;

    connectors.push({
      points: [
        [firstCenter, partnerLineY],
        [lastCenter, partnerLineY],
      ],
    });
  }

  if (mergedChildren.width === 0) {
    return {
      width,
      height: parentHeight,
      anchorX: parentCenterX,
      entryAnchors,
      cards,
      connectors,
    };
  }

  const childrenOffsetX = (width - mergedChildren.width) / 2;
  const childrenOffsetY = parentHeight + LEVEL_GAP;
  const childBarY = parentHeight + CHILD_BAR_OFFSET;
  const shiftedChildren = offsetSubtree(
    {
      width: mergedChildren.width,
      height: mergedChildren.height,
      anchorX: 0,
      entryAnchors: mergedChildren.entryAnchors,
      cards: mergedChildren.cards,
      connectors: mergedChildren.connectors,
    },
    childrenOffsetX,
    childrenOffsetY,
  );

  const absoluteChildAnchors = group.children.map((childId) => {
    const anchorX = mergedChildren.entryAnchors[childId];

    if (anchorX === undefined) {
      throw new Error(`Mangler entry anchor for child "${childId}".`);
    }

    return anchorX + childrenOffsetX;
  });
  const childrenTopY = childrenOffsetY;

  connectors.push({
    points: [
      [parentCenterX, group.parents.length > 1 ? partnerLineY : parentHeight],
      [parentCenterX, childBarY],
    ],
  });

  if (absoluteChildAnchors.length > 1) {
    connectors.push({
      points: [
        [absoluteChildAnchors[0], childBarY],
        [absoluteChildAnchors[absoluteChildAnchors.length - 1], childBarY],
      ],
    });
  }

  absoluteChildAnchors.forEach((anchorX) => {
    connectors.push({
      points: [
        [anchorX, childBarY],
        [anchorX, childrenTopY],
      ],
    });
  });

  return {
    width,
    height: childrenOffsetY + mergedChildren.height,
    anchorX: parentCenterX,
    entryAnchors: {
      ...entryAnchors,
      ...shiftedChildren.entryAnchors,
    },
    cards: [...cards, ...shiftedChildren.cards],
    connectors: [
      ...connectors,
      ...shiftedChildren.connectors,
    ],
  };
}

export function buildTreeLayout(tree: FamilyTreeData): TreeLayout {
  const rowHeights = buildRowHeights(tree);
  const subtree = layoutGroup(tree.rootGroupId, tree, rowHeights, 0);

  return {
    width: subtree.width,
    height: subtree.height,
    cards: subtree.cards,
    connectors: subtree.connectors,
  };
}
