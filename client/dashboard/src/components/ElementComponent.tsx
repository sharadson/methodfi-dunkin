import { useMethod } from 'react-method-elements';

function ElementComponent() {
  const method = useMethod({
    env: 'dev',
    onEvent: (payload) => console.log('onEvent', payload),
    onSuccess: (payload) => console.log('onSuccess', payload),
    onError: (payload) => console.log('onError', payload),
    onExit: (payload) => console.log('onExit', payload),
    onOpen: (payload) => console.log('onOpen', payload),
  });

  if (!method) return null;

  const onClick = () => {
    method.open('pk_elem_X4mwByqp3kBQq4nR8AYMAq36gRBnAH9D');
  };

  return (
    <div className="ElementComponent">
      <header className="App-header">
        <button onClick={onClick}>
          Open Element
        </button>
      </header>
    </div>
  );
}

export default ElementComponent;
