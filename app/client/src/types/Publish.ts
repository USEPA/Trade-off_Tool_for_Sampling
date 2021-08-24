export type SampleTypeOption = {
  label: string;
  value: string | null;
  serviceId: string;
  status: 'add' | 'edit' | 'delete' | 'published' | 'published-ago';
};

export type SampleTypeOptions = SampleTypeOption[];
