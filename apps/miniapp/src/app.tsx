import { Component, PropsWithChildren } from 'react';
import { useAuthStore } from './stores/auth';
import './app.scss';

class App extends Component<PropsWithChildren> {
  componentDidMount() {
    this.initApp();
  }

  async initApp() {
    const { init } = useAuthStore.getState();
    await init();
  }

  render() {
    return this.props.children;
  }
}

export default App;
