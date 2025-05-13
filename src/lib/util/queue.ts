export class SingleAsyncQueue {
    private queue: (() => Promise<void>)[] = [];

    async run(task: () => Promise<void>) {
        if (this.queue.length === 0) {
            this.queue.push(task);
            this.next();
        } else {
            this.queue[1] = task;
        }
    }

    private async next() {
        while (this.queue.length > 0) {
            try {
                await this.queue[0]?.();
            } finally {
                this.queue.shift();
            }
        }
    }
}
