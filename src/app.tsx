import * as React from 'react'
import {
    HashRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from 'react-router-dom'
import { ICircoStudiaProps } from './webparts/circoStudia/components/ICircoStudiaProps'
import { PresetProvider, usePreset } from './context/PresetContext'

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
import FormularioCursando from './webparts/formularioCursando/components/FormularioCursando'
import Perfil from './webparts/perfil/components/Perfil'
import PerfilColega from './webparts/perfilColega/components/PerfilColega'
import GestionarPlanDeEstudios from './webparts/gestionarPlanDeEstudios/components/GestionarPlanDeEstudios'
import CargarOfertaDeMaterias from './webparts/cargarOfertaDeMaterias/components/CargarOfertaDeMaterias'
import GestionDeRoles from './webparts/gestionDeRoles/components/GestionDeRoles'
import GestionarComision from './webparts/gestionarComision/components/GestionarComision'
import Estudiantes from './webparts/estudiantes/components/Estudiantes'

// ✅ Ruta protegida para evitar acceso a preset si ya fue hecho
const ProtectedPresetRoute: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { presetDone } = usePreset()
    const location = useLocation()

    if (presetDone === undefined) {
        return <div>Cargando aplicación...</div>
    }

    if (presetDone && location.pathname.startsWith('/preset')) {
        return <Navigate to='/inicio' replace />
    }

    if (!presetDone && !location.pathname.startsWith('/preset')) {
        return <Navigate to='/preset/select-carrera' replace />
    }

    return <>{children}</>
}

const AppRoutes: React.FC<ICircoStudiaProps> = (props) => {
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
            <Route
                path='/formularioCursando'
                element={<FormularioCursando {...props} />}
            />
            <Route path='/perfil' element={<Perfil {...props} />} />
            <Route
                path='/perfilColega/:id'
                element={<PerfilColega {...props} />}
            />
            <Route path='/inicio' element={<Inicio {...props} />} />
            <Route
                path='/admin/gestionar-plan'
                element={<GestionarPlanDeEstudios {...props} />}
            />
            <Route
                path='/admin/cargar-oferta'
                element={<CargarOfertaDeMaterias {...props} />}
            />
            <Route
                path='/admin/gestionar-roles'
                element={<GestionDeRoles {...props} />}
            />
            <Route
                path='/admin/estudiantes'
                element={<Estudiantes {...props} />}
            />
            <Route
                path='/admin/gestionar-comision'
                element={<GestionarComision {...props} />}
            />
        </Routes>
    )
}

const App: React.FC<ICircoStudiaProps> = (props): JSX.Element => {
    return (
        <PresetProvider context={props.context}>
            <HashRouter>
                <ProtectedPresetRoute>
                    <AppRoutes {...props} />
                </ProtectedPresetRoute>
            </HashRouter>
        </PresetProvider>
    )
}

export default App
