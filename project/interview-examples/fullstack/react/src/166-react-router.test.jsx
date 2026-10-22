import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { AppRoutes } from './166-react-router.jsx';

// MemoryRouter keeps history in memory: ideal for tests (BrowserRouter in the real app)
const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);

test('links navigate between routes', async () => {
  renderAt('/');
  expect(screen.getByRole('heading')).toHaveTextContent('Home');
  await userEvent.click(screen.getByRole('link', { name: 'Products' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Products');
});

test('useParams reads :id and useNavigate goes back', async () => {
  renderAt('/products/42');
  await userEvent.click(screen.getByRole('button', { name: 'Back to products (42)' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Products');
});

test('protected route redirects to /login, then back after login', async () => {
  renderAt('/account');
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Log in' })); // we are on /login
  expect(screen.getByRole('heading')).toHaveTextContent('Account of Asha');
});

test('unknown paths hit the catch-all route', () => {
  renderAt('/nope');
  expect(screen.getByText('Page not found')).toBeInTheDocument();
});
