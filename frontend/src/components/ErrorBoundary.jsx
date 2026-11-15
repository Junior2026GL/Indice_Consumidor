import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Error de interfaz:', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2>Algo salió mal</h2>
        <p>Ocurrió un error inesperado en la aplicación.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Recargar la página
        </button>
      </div>
    );
  }
}
