import * as React from 'react';
import type { IPerfilProps } from './IPerfilProps';
import Menu from '../../menu/components/Menu';
import { getSP } from '../../../pnpjsConfig'
import { useEffect, useState } from 'react'

const PerfilEstudiante: React.FC<IPerfilProps> = ({ context }) => {
   const sp = getSP(context)
   const [nombre, setNombre] = useState<string>('Estudiante')
   const [email, setEmail] = useState<string>('Estudiante')
   const [foto, setFoto] = useState<string>('')

   useEffect(() => {
           const datosPerfil = async (): Promise<void> => {
               try {
                   const user = await sp.web.currentUser()
                   setNombre(user.Title)
                    setEmail(user.Email)

            // Obtener PictureUrl desde User Profile
            const profile = await sp.profiles.myProperties()
            const fotoPerfil = profile?.UserProfileProperties?.find(
            (p: { Key: string; Value: string }) => p.Key === 'PictureURL'
          )?.Value


            setFoto(fotoPerfil || '')
        } catch (error) {
            console.error('Error cargando datos del perfil:', error)
        }
    }
   
           datosPerfil().catch(console.error)
       }, [context])


   return (
       <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu />
      <h1>Perfil</h1>
      <img src="" alt="" />
      <h2>{nombre}</h2>
      <h3>{email}</h3>
      <img
      src={foto || 'https://static.thenounproject.com/png/5034901-200.png'}
      alt="Foto de perfil"
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: '2px solid #000',
        objectFit: 'cover',
      }}
    />

      </div>
    );
  
}
export default PerfilEstudiante



   

