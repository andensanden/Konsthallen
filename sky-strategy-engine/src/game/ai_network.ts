// ai_network.ts

export class NeuralNetwork {
  private weightsInputHidden: number[][];
  private weightsHiddenOutput: number[][];

  public inputSize: number;
  public hiddenSize: number;
  public outputSize: number;

  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    // Skapar slumpmässiga vikter (en "dum" AI från start)
    this.weightsInputHidden = this.randomizeMatrix(inputSize, hiddenSize);
    this.weightsHiddenOutput = this.randomizeMatrix(hiddenSize, outputSize);
  }

  // Tar in situationen (mellan 0.0 och 1.0) och spottar ut beslutet
  public predict(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) {
      throw new Error(`Expected ${this.inputSize} inputs, got ${inputs.length}`);
    }

    const hidden = this.computeLayer(inputs, this.weightsInputHidden);
    const output = this.computeLayer(hidden, this.weightsHiddenOutput);
    return output;
  }

  private computeLayer(inputs: number[], weights: number[][]): number[] {
    const outputs = new Array(weights[0].length).fill(0);
    for (let i = 0; i < weights[0].length; i++) {
      let sum = 0;
      for (let j = 0; j < inputs.length; j++) {
        sum += inputs[j] * weights[j][i];
      }
      // ReLU aktiveringsfunktion (tar bort negativa tal)
      outputs[i] = Math.max(0, sum);
    }
    return outputs;
  }

  private randomizeMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() * 2 - 1)
    );
  }

  // ==========================================
  // Dessa används senare när du ska träna AI:n
  // ==========================================
  public getWeights(): { ih: number[][], ho: number[][] } {
    return {
      ih: JSON.parse(JSON.stringify(this.weightsInputHidden)),
      ho: JSON.parse(JSON.stringify(this.weightsHiddenOutput))
    };
  }

  public setWeights(ih: number[][], ho: number[][]) {
    this.weightsInputHidden = JSON.parse(JSON.stringify(ih));
    this.weightsHiddenOutput = JSON.parse(JSON.stringify(ho));
  }
}