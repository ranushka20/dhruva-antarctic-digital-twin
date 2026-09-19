import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * A WebGL context loss or a bad geometry prop should degrade to a readable
 * message, not a white screen over the whole console.
 */
export class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[twin] scene render failed", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-viewport">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert className="text-warning-foreground" />
            </EmptyMedia>
            <EmptyTitle>Viewport could not render</EmptyTitle>
            <EmptyDescription>
              The 3D scene failed to draw. This is usually a lost WebGL context —
              reloading the viewport normally recovers it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={this.reset} size="sm" variant="outline">
              Reload viewport
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
}
