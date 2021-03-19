describe('Homepage', function () {
  beforeEach(function () {
    // clear session storage and open the app
    sessionStorage.clear();
    cy.visit('/');
  });

  it('contains placeholder text', function () {
    cy.findByText('Trade-off Tool for Sampling (TOTS)').should('be.visible');
  });
});
