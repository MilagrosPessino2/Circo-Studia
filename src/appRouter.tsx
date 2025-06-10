import * as React from 'react';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';
import CargarMateriasAprobadasInicial from './webparts/cargarMateriasAprobadasInicial/components/CargarMateriasAprobadasInicial';



const AppRouter: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route path="/cargar-materias" component={CargarMateriasAprobadasInicial} />
        <Route render={() => <h2>Página no encontrada</h2>} />
      </Switch>
    </Router>
  );
};

export default AppRouter;
