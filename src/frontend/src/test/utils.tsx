import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

interface AllTheProvidersProps {
	children: ReactNode;
	routerProps?: MemoryRouterProps;
}

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});
}

function AllTheProviders({ children, routerProps }: AllTheProvidersProps) {
	const queryClient = createTestQueryClient();
	return (
		<QueryClientProvider client={queryClient}>
			<MemoryRouter {...routerProps}>{children}</MemoryRouter>
		</QueryClientProvider>
	);
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
	routerProps?: MemoryRouterProps;
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
	const { routerProps, ...renderOptions } = options || {};
	return render(ui, {
		wrapper: ({ children }) => (
			<AllTheProviders routerProps={routerProps}>{children}</AllTheProviders>
		),
		...renderOptions,
	});
}

export * from "@testing-library/react";
export { customRender as render };
