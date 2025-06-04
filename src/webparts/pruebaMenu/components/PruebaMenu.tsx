import * as React from 'react';
import {
  Stack, DefaultButton, ComboBox, IComboBoxOption,
  Text
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

const columnHeaders = [
  { key: 'codigo', name: 'Código' },
  { key: 'materia', name: 'Materia' },
  { key: 'comision', name: 'Comisión' },
  { key: 'dias', name: 'Dias' },
  { key: 'turno', name: 'Turno' },
  { key: 'modalidad', name: 'Modalidad' },
];

const PruebaMenu: React.FC<IPruebaMenuProps> = ({ context }) => {
  const [materias, setMaterias] = React.useState<any[]>([]);
  const [selectedCarrera, setSelectedCarrera] = React.useState<string>('desarrollo');
  const [estudiante, setEstudiante] = React.useState<any>(null);

  const sp = React.useMemo(() => spfi().using(SPFx(context)), [context]);

  const fetchMaterias = async (lista: string) => {
    try {
      const items = await sp.web.lists.getByTitle(lista)
        .items.select('Id', 'Title', 'field_1', 'field_2', 'field_3', 'field_4', 'field_5', 'field_6')
        .top(4999)();

      const mapped = items.map(item => ({
        codigo: item.Title,
        materia: item.field_1,
        comision: item.field_2,
        turno: item.field_3,
        dias: item.field_4,
        modalidad: item.field_5
      }));

      setMaterias(mapped);
    } catch (err) {
      console.error(`Error al traer materias de ${lista}`, err);
      setMaterias([]);
    }
  };


const fetchEstudiante = async () => {
  try {
    const item = await sp.web.lists.getByTitle("Estudiante")
      .items.getById(1)
      .select("Id", "usuario/Title", "usuario/Id") 
      .expand("usuario")();

    setEstudiante(item);
    console.log("✅ Estudiante obtenido:", item);
  } catch (err) {
    console.error("❌ Error al traer estudiante con ID 1", err);
  }
};



  React.useEffect(() => {
    void fetchMaterias("Oferta_materias_TecWeb");
    void fetchEstudiante();
  }, []);

  const onCarreraChange = (_event: any, option?: IComboBoxOption): void => {
    if (option) {
      setSelectedCarrera(option.key.toString());

      const lista = option.key === 'ingenieria'
        ? 'Oferta_materias_IngInf'
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

      <Stack grow styles={{ root: { padding: 20, overflow: 'hidden', maxWidth: 'calc(100vw - 170px)' } }}>
        <Text variant="xLargePlus">Oferta Materias</Text>

          {estudiante && estudiante.usuario && (
      <Text variant="mediumPlus" styles={{ root: { marginTop: 10, marginBottom: 10 } }}>
        👤 Estudiante: {estudiante.usuario.Title} (ID SharePoint: {estudiante.usuario.Id})
      </Text>
    )}


        <ComboBox
          selectedKey={selectedCarrera}
          onChange={onCarreraChange}
          placeholder="Seleccionar carrera"
          options={dropdownOptions}
          styles={{ root: { width: 300, marginBottom: 20 } }}
        />

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                {columnHeaders.map(col => (
                  <th key={col.key} style={{
                    borderBottom: '1px solid #ccc',
                    textAlign: 'left',
                    padding: '8px',
                    backgroundColor: '#f3f2f1'
                  }}>
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materias.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  {columnHeaders.map(col => (
                    <td key={col.key} style={{
                      padding: '8px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {item[col.key as keyof typeof item]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Stack>
    </Stack>
  );
};

export default PruebaMenu;
