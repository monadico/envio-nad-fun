import assert from "assert";
import { 
  TestHelpers,
  BondingCurve_CurveBuy
} from "generated";
const { MockDb, BondingCurve } = TestHelpers;

describe("BondingCurve contract CurveBuy event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for BondingCurve contract CurveBuy event
  const event = BondingCurve.CurveBuy.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("BondingCurve_CurveBuy is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await BondingCurve.CurveBuy.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualBondingCurveCurveBuy = mockDbUpdated.entities.BondingCurve_CurveBuy.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedBondingCurveCurveBuy: BondingCurve_CurveBuy = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      sender: event.params.sender,
      token: event.params.token,
      amountIn: event.params.amountIn,
      amountOut: event.params.amountOut,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualBondingCurveCurveBuy, expectedBondingCurveCurveBuy, "Actual BondingCurveCurveBuy should be the same as the expectedBondingCurveCurveBuy");
  });
});
