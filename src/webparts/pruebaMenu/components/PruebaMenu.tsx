import * as React from 'react';
import {
  Stack, DefaultButton, ComboBox, IComboBoxOption,
  Text, DetailsList, DetailsListLayoutMode, IColumn
} from '@fluentui/react';
import { IPruebaMenuProps } from './IPruebaMenuProps';
import { spfi, SPFx } from '@pnp/sp';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

const dropdownOptions: IComboBoxOption[] = [
  { key: 'desarrollo', text: 'Tecnicatura en desarrollo web' },
  { key: 'ingenieria', text: 'Ingeniería informática' }
];

const columns: IColumn[] = [
  { key: 'Title', name: 'Código', fieldName: 'codigo', minWidth: 70, maxWidth: 90 },
  { key: 'field_1', name: 'Materia', fieldName: 'materia', minWidth: 150 },
  { key: 'field_2', name: 'Comisión', fieldName: 'comision', minWidth: 100 },
  { key: 'field_3', name: 'Horario', fieldName: 'horario', minWidth: 130 },
  { key: 'field_4', name: 'Aula', fieldName: 'aula', minWidth: 80 },
  { key: 'field_5', name: 'Modalidad', fieldName: 'modalidad', minWidth: 150 },
];

const PruebaMenu: React.FC<IPruebaMenuProps> = ({ context }) => {
  const [materias, setMaterias] = React.useState<any[]>([]);
  const [selectedCarrera, setSelectedCarrera] = React.useState<string>('desarrollo'); // default

  const sp = React.useMemo(() => spfi().using(SPFx(context)), [context]);

  const fetchMaterias = async (lista: string) => {
    try {
      const items = await sp.web.lists.getByTitle(lista)
        .items.select('Id', 'Title', 'field_1', 'field_2', 'field_3', 'field_4', 'field_5')();

      const mapped = items.map(item => ({
        codigo: item.Title,
        materia: item.field_1,
        comision: item.field_2,
        horario: item.field_3,
        aula: item.field_4,
        modalidad: item.field_5
      }));

      setMaterias(mapped);
    } catch (err) {
      console.error(`Error al traer materias de ${lista}`, err);
      setMaterias([]); // limpio si falla
    }
  };

  // Cargar por defecto al iniciar
  React.useEffect(() => {
   void fetchMaterias("Oferta_materias_TecWeb");
  }, []);

 const onCarreraChange = (_event: any, option?: IComboBoxOption): void => {

  
    if (option) {
      setSelectedCarrera(option.key.toString());

      const lista = option.key === 'ingenieria'
        ? 'Oferta_materias_IngIf'
        : 'Oferta_materias_TecWeb';

      void fetchMaterias(lista);
      console.log('🔍 Buscando lista:', lista);

    }
  };
  

  return (
    <Stack horizontal styles={{ root: { height: '100%', backgroundColor: '#f3f2f1' } }}>
      <Stack
        tokens={{ childrenGap: 10 }}
        styles={{ root: { width: 150, padding: 10, backgroundColor: '#e1dfdd' } }}
      >
        <Text variant="large">Circo Studia</Text>
        <DefaultButton text="Inicio" />
        <DefaultButton text="Oferta" />
        <DefaultButton text="Mis materias" />
        <DefaultButton text="Coincidencias" />
      </Stack>

      <Stack grow styles={{ root: { padding: 20 } }}>
        <Text variant="xLargePlus">Oferta Materias</Text>
        <ComboBox
          selectedKey={selectedCarrera}
          onChange={onCarreraChange}
          placeholder="Seleccionar carrera"
          options={dropdownOptions}
          styles={{ root: { width: 300, marginTop: 10, marginBottom: 20 } }}
        />
        <DetailsList
          items={materias}
          columns={columns}
          setKey="set"
          layoutMode={DetailsListLayoutMode.fixedColumns}
        />
      </Stack>
    </Stack>
  );
};

export default PruebaMenu;
