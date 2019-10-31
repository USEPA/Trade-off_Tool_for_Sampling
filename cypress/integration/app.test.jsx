describe('Homepage', function() {
  beforeEach(function() {
    cy.visit('/');
  });

  it('contains placeholder text', function() {
    cy.findByText('(TOTS Application)').should('be.visible');
  });
});
