describe('Homepage', function () {
  beforeEach(function () {
    cy.visit('/');
  });

  it('contains placeholder text', function () {
    cy.findByText('Trade-off Tool for Sampling (TOTS)').should('be.visible');
  });
});
