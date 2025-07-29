import * as React from 'react'
import {
    useEffect,
    useState,
    createContext,
    useContext,
    ReactNode,
} from 'react'
import { getSP } from '../pnpjsConfig'
import { WebPartContext } from '@microsoft/sp-webpart-base'

interface PresetContextType {
    presetDone: boolean | undefined
    refetchPreset: () => Promise<void>
}

const PresetContext = createContext<PresetContextType>({
    presetDone: undefined,
    refetchPreset: async () => {}, // valor inicial
})

interface PresetProviderProps {
    children: ReactNode
    context: WebPartContext
}

interface IEstudiante {
    ID: number
    preset: boolean
    usuario?: {
        Id: number
    }
}

export const PresetProvider: React.FC<PresetProviderProps> = ({
    children,
    context,
}) => {
    const [presetDone, setPresetDone] = useState<boolean | undefined>(undefined)

    const fetchPreset = async (): Promise<void> => {
        try {
            const sp = getSP(context)
            const user = await sp.web.currentUser()
            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id', 'preset')
                .expand('usuario')()

            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === user.Id
            )

            setPresetDone(estudiante?.preset || false)
        } catch (err) {
            console.error('Error cargando estado de preset:', err)
            setPresetDone(false)
        }
    }

    useEffect(() => {
        fetchPreset().catch(console.error)
    }, [context])

    return (
        <PresetContext.Provider
            value={{ presetDone, refetchPreset: fetchPreset }}
        >
            {children}
        </PresetContext.Provider>
    )
}

export const usePreset = (): PresetContextType => useContext(PresetContext)
