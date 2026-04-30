import { getCollection } from "astro:content";

export type FamilyPerson = {
  id: string;
  fullName: string;
  signName: string;
  canSignLanguage: boolean;
  birthDate?: string;
  deathDate?: string;
  notes?: string;
};

export type FamilyGroup = {
  id: string;
  parents: string[];
  children: string[];
};

export type FamilyTreeData = {
  rootGroupId: string;
  people: Record<string, FamilyPerson>;
  groups: Record<string, FamilyGroup>;
  parentGroupByPerson: Record<string, string>;
};

export async function getFamilyTreeData(): Promise<FamilyTreeData> {
  const peopleEntries = await getCollection("familyPeople");
  const relationEntries = await getCollection("familyRelations");
  const relation = relationEntries[0]?.data;

  if (!relation) {
    throw new Error("Mangler relationsdata for stamtræet.");
  }

  const people = Object.fromEntries(peopleEntries.map((entry) => [entry.data.id, entry.data]));

  const groups = Object.fromEntries(
    relation.groups.map((group) => {
      for (const parentId of group.parents) {
        if (!people[parentId]) {
          throw new Error(`Ukendt parent-id "${parentId}" i gruppen "${group.id}".`);
        }
      }

      for (const childId of group.children) {
        if (!people[childId]) {
          throw new Error(`Ukendt child-id "${childId}" i gruppen "${group.id}".`);
        }
      }

      return [
        group.id,
        group,
      ];
    }),
  );

  const parentGroupByPerson = Object.values(groups).reduce<Record<string, string>>((accumulator, group) => {
    for (const parentId of group.parents) {
      accumulator[parentId] = group.id;
    }

    return accumulator;
  }, {});

  return {
    rootGroupId: relation.rootGroupId,
    people,
    groups,
    parentGroupByPerson,
  };
}
