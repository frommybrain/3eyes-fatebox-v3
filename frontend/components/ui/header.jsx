
import RevealButton from './buttonReveal';
import PlainButton from './buttonPlain';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full h-16 flex items-center justify-end pr-4">
      <div className="flex items-center">
        <PlainButton text="to do: CA" arrow/>
        <RevealButton text="to do: wallet connect" />
      </div>
    </header>
  );
}
  