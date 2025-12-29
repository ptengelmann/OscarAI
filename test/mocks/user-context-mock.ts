// test/mocks/user-context-mock.ts


export let mockUserContext: { user: any, login: jest.Mock, isLoading: boolean } = {
  user: null,
  login: jest.fn(),
  isLoading: false
}

jest.mock('@/contexts/UserContext', () => ({
  useUser: () => mockUserContext
}))
