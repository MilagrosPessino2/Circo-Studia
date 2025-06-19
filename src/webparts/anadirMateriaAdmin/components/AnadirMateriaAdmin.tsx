import * as React from 'react'
import styles from './AnadirMateriaAdmin.module.scss'
import type { IAnadirMateriaAdminProps } from './IAnadirMateriaAdminProps'
import { getSP } from '../../../pnpjsConfig'
import { Dropdown, PrimaryButton, TextField, Spinner } from '@fluentui/react'

interface IMateria {
    Id: number
    codMateria: string
    nombre: string
}

interface ICarrera {
    Id: number
    nombre: string
}

interface IAnadirMateriaAdminState {
    codMateria: string
    nombre: string
    anio: string
    carreraSeleccionada: number | undefined
    correlativaSeleccionada: number | undefined
    carreras: ICarrera[]
    materias: IMateria[]
    loading: boolean
    error: string | undefined
}

export default class AnadirMateriaAdmin extends React.Component<
    IAnadirMateriaAdminProps,
    IAnadirMateriaAdminState
> {
    constructor(props: IAnadirMateriaAdminProps) {
        super(props)
        this.state = {
            codMateria: '',
            nombre: '',
            anio: '',
            carreraSeleccionada: undefined,
            correlativaSeleccionada: undefined,
            carreras: [],
            materias: [],
            loading: true,
            error: undefined,
        }
    }

    public async componentDidMount(): Promise<void> {
        const sp = getSP(this.props.context)
        try {
            const carreras: ICarrera[] = await sp.web.lists
                .getByTitle('Carrera')
                .items.select('Id', 'nombre')()

            const materias: IMateria[] = await sp.web.lists
                .getByTitle('Materia')
                .items.select('Id', 'codMateria', 'nombre')()

            this.setState({ carreras, materias, loading: false })
        } catch (err) {
            console.error('❌ Error cargando datos:', err)
            this.setState({
                error: 'No se pudieron cargar las listas. Verificá que existan las listas "Carrera", "Materia", "MateriaCarrera" y "Correlativa".',
                loading: false,
            })
        }
    }

    private agregarMateria = async (): Promise<void> => {
        const sp = getSP(this.props.context)
        const {
            codMateria,
            nombre,
            anio,
            carreraSeleccionada,
            correlativaSeleccionada,
        } = this.state

        if (!carreraSeleccionada) {
            alert('Por favor seleccioná una carrera.')
            return
        }

        try {
            // Validar duplicado
            const existe = await sp.web.lists
                .getByTitle('Materia')
                .items.filter(`codMateria eq '${codMateria}'`)()
            if (existe.length > 0) {
                alert('⚠️ Ya existe una materia con ese código.')
                return
            }

            // Crear materia
            const nuevaMateria = await sp.web.lists
                .getByTitle('Materia')
                .items.add({
                    codMateria,
                    nombre,
                    anio: parseInt(anio),
                })

            const nuevaMateriaId = nuevaMateria.data.Id

            // Insertar en MateriaCarrera
            await sp.web.lists.getByTitle('MateriaCarrera').items.add({
                CodMateriaId: nuevaMateriaId,
                codCarreraId: carreraSeleccionada,
            })

            // Insertar en Correlativa (si hay)
            if (correlativaSeleccionada) {
                await sp.web.lists.getByTitle('Correlativa').items.add({
                    codMateriaId: nuevaMateriaId,
                    codMateriaRequeridaId: correlativaSeleccionada,
                })
            }

            alert('✅ Materia añadida con éxito.')
        } catch (err) {
            console.error('❌ Error al añadir materia:', err)
            alert(
                'Error al añadir la materia. Verificá que existan todas las listas y relaciones correctamente configuradas.'
            )
        }
    }

    public render(): React.ReactElement<IAnadirMateriaAdminProps> {
        const {
            codMateria,
            nombre,
            anio,
            carreraSeleccionada,
            correlativaSeleccionada,
            carreras,
            materias,
            loading,
            error,
        } = this.state

        return (
            <section className={styles.anadirMateriaAdmin}>
                <h2>Añadir nueva materia</h2>

                {loading && <Spinner label='Cargando datos...' />}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {!loading && !error && (
                    <div>
                        <TextField
                            label='Código de materia'
                            value={codMateria}
                            onChange={(_, v) =>
                                this.setState({ codMateria: v || '' })
                            }
                        />
                        <TextField
                            label='Nombre de materia'
                            value={nombre}
                            onChange={(_, v) =>
                                this.setState({ nombre: v || '' })
                            }
                        />
                        <TextField
                            label='Año'
                            value={anio}
                            onChange={(_, v) =>
                                this.setState({ anio: v || '' })
                            }
                        />

                        <Dropdown
                            label='Carrera'
                            selectedKey={carreraSeleccionada}
                            options={carreras.map((c) => ({
                                key: c.Id,
                                text: c.nombre,
                            }))}
                            onChange={(_, option) =>
                                this.setState({
                                    carreraSeleccionada: option?.key as number,
                                })
                            }
                        />

                        <Dropdown
                            label='Correlativa (opcional)'
                            selectedKey={correlativaSeleccionada}
                            options={materias.map((m) => ({
                                key: m.Id,
                                text: `${m.codMateria} - ${m.nombre}`,
                            }))}
                            onChange={(_, option) =>
                                this.setState({
                                    correlativaSeleccionada:
                                        option?.key as number,
                                })
                            }
                        />

                        <PrimaryButton
                            text='Añadir materia'
                            onClick={this.agregarMateria}
                            style={{ marginTop: 16 }}
                        />
                    </div>
                )}
            </section>
        )
    }
}
