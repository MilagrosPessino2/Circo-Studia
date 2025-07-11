import * as React from 'react'
import { useEffect, useState, createContext } from 'react'
import {
    HashRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from 'react-router-dom'
import { ICircoStudiaProps } from './webparts/circoStudia/components/ICircoStudiaProps'

// COMPONENTES
import SeleccionarCarrera from './webparts/seleccionarCarrera/components/SeleccionarCarrera'
import CargarMateriasAprobadasInicial from './webparts/cargarMateriasAprobadasInicial/components/CargarMateriasAprobadasInicial'
import CargarMateriasRegularizada from './webparts/cargarMateriaRegularizada/components/CargarMateriaRegularizada'
import SeleccionarMateriasEnCurso from './webparts/seleccionarMateriasEnCurso/components/SeleccionarMateriasEnCurso'
import Inicio from './webparts/inicio/components/Inicio'
import MisMaterias from './webparts/misMaterias/components/MisMaterias'
import Coincidencias from './webparts/coincidencias/components/Coincidencias'
import Oferta from './webparts/oferta/components/Oferta'
import Formulario from './webparts/formulario/components/Formulario'
import Perfil from './webparts/perfil/components/Perfil'
import PerfilColega from './webparts/perfilColega/components/PerfilColega'
import Estudiantes from './webparts/estudiantes/components/Estudiantes'
import GestionarPlanDeEstudios from './webparts/gestionarPlanDeEstudios/components/GestionarPlanDeEstudios'

export const UserPresetContext = createContext<{
    isPreset: boolean
    setIsPreset: (v: boolean) => void
}>({
    isPreset: false,
    setIsPreset: () => {},
})

const AppRoutes: React.FC<ICircoStudiaProps> = (props) => {
    const { isPreset } = React.useContext(UserPresetContext)
    const location = useLocation()

    if (!isPreset && !location.pathname.startsWith('/preset')) {
        return <Navigate to='/preset/select-carrera' replace />
    }

    return (
        <Routes>
            <Route
                path='/preset/select-carrera'
                element={<SeleccionarCarrera {...props} />}
            />
            <Route
                path='/preset/cargar-aprobadas'
                element={<CargarMateriasAprobadasInicial {...props} />}
            />
            <Route
                path='/preset/cargar-regularizada'
                element={<CargarMateriasRegularizada {...props} />}
            />
            <Route
                path='/preset/select-materias-en-curso'
                element={<SeleccionarMateriasEnCurso {...props} />}
            />
            <Route path='/mis-materias' element={<MisMaterias {...props} />} />
            <Route
                path='/coincidencias'
                element={<Coincidencias {...props} />}
            />
            <Route path='/oferta' element={<Oferta {...props} />} />
            <Route path='/formulario' element={<Formulario {...props} />} />
            <Route path='/perfil' element={<Perfil {...props} />} />
            <Route
                path='/perfilColega/:id'
                element={<PerfilColega {...props} />}
            />

            <Route path='/inicio' element={<Inicio {...props} />} />
            <Route path='/estudiantes' element={<Estudiantes {...props} />} />
            <Route
                path='/gestionar-plan'
                element={<GestionarPlanDeEstudios {...props} />}
            />
        </Routes>
    )
}

const App: React.FC<ICircoStudiaProps> = (props): JSX.Element => {
    const [isPreset, setIsPreset] = useState<boolean>(false)
    const [presetCargado, setPresetCargado] = useState<boolean>(false)

    useEffect(() => {
        const stored = localStorage.getItem('userPreset') === 'true'
        setIsPreset(stored)
        setPresetCargado(true)
    }, [])

    if (!presetCargado) return <div>Cargando aplicación...</div>

    return (
        <UserPresetContext.Provider value={{ isPreset, setIsPreset }}>
            <HashRouter>
                <AppRoutes {...props} />
            </HashRouter>
        </UserPresetContext.Provider>
    )
}

export default App
