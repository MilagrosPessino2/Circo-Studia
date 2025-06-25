import * as React from 'react';
import type { IPerfilColegaProps } from './IPerfilColegaProps';
import { getSP } from '../../../pnpjsConfig';
import { useEffect } from 'react';



const PerfilColega: React.FC<IPerfilColegaProps> = ({ context }) => {
  const sp = getSP(context);
useEffect(() => {
    const cargarPerfil = async () => {

          const estudiantes = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name')
          .expand('usuario')();
          console.log(estudiantes);

    };
    void cargarPerfil();
 }, [context]);

    return (
     
      <h1>Hola Mili</h1>
    );
  
}

export default PerfilColega;