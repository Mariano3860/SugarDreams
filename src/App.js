import React, { Suspense, useRef, useState } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { Billboard, Html, OrbitControls, OrthographicCamera, Plane, Points } from "@react-three/drei"
import Ribbon from "./Ribbon"
import Effects from "./Effects"
import * as THREE from "three"
import lisa from "./resources/animations/char-sheet.png"
import lisaJson from "./resources/animations/char.json"
import gremlin from "./resources/animations/bomber.png"
import gremlinJson from "./resources/animations/bomber.json"
import bard from "./resources/animations/smiley.png"
import bardJson from "./resources/animations/smiley.json"
import frog from "./resources/frog.png"
import { LiveblocksProvider, RoomProvider, useMyPresence, useOthers } from "@liveblocks/react"
import { mouseButton, useButtonPressed } from "use-control"
import { useMousePositionY } from "./useMousePosition"
import { createClient } from "@liveblocks/client"
import { Vector3 } from "three"
import { useSpring, animated } from "@react-spring/three"
import { useAseprite } from "./useAseprite"

const Cell = React.forwardRef(({ position, onClick }, ref) => {
  const [hovered, setHovered] = useState(false)

  return (
    <group ref={ref}>
      <mesh
        onClick={() => onClick(position)}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        position={position}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={hovered ? "green" : "grey"} />
      </mesh>
      {/* <mesh position={position}>
        <boxGeometry args={[1, 1]} />
        <meshStandardMaterial color={"grey"} />
      </mesh> */}
    </group>
  )
})

const Image = React.forwardRef(({ src }, ref) => {
  const texture = useLoader(THREE.TextureLoader, src)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter

  return (
    <mesh ref={ref}>
      <planeBufferGeometry attach="geometry" args={[1, 1]} />
      <meshBasicMaterial transparent={true} attach="material" map={texture} />
    </mesh>
  )
})

const AnimatedSprite = React.forwardRef(({ src, position, frameCount, frameTime = 100 }, ref) => {
  const texture = useLoader(THREE.TextureLoader, src)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter

  texture.repeat.set(1 / frameCount, 1 / 1)

  const t = useRef(0)
  const index = useRef(0)

  useFrame((_, delta) => {
    t.current += delta * 1000

    if (t.current >= frameTime) {
      index.current += 1
      if (index.current >= frameCount) {
        index.current = 0
      }
      t.current = 0

      texture.offset.x = index.current / frameCount
    }
  })

  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial transparent={true} map={texture} />
    </sprite>
  )
})

const AsepriteTest = React.forwardRef(({ position }, ref) => {
  const texture = useAseprite(lisa, lisaJson)

  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial transparent={true} map={texture} />
    </sprite>
  )
})

const GremlinTest = React.forwardRef(({ position, animation = "idle" }, ref) => {
  const texture = useAseprite(gremlin, gremlinJson, animation)

  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial transparent={true} map={texture} />
    </sprite>
  )
})

const BardTest = React.forwardRef(({ position, animation = "idle" }, ref) => {
  const texture = useAseprite(bard, bardJson, animation, false)

  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial transparent={true} map={texture} />
    </sprite>
  )
})

const Sprite = React.forwardRef(({ img, position }, ref) => {
  return (
    <Billboard ref={ref} position={position}>
      <Image src={img} />
    </Billboard>
  )
})

const SmoothMove = ({ children, position }) => {
  const { pos } = useSpring({ pos: position })
  return <animated.group position={pos}>{children}</animated.group>
}

function grid(w, h) {
  const res = []
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      res.push([x, 0, y])
    }
  }

  return res
}

const inputMap = {
  buttons: {
    go: [mouseButton("left")],
  },
}

function Room() {
  const spacing = 1.1
  const cellCount = 8
  const cells = grid(cellCount, cellCount).map(([x, y, z]) => [x * spacing, y * spacing, z * spacing])

  const others = useOthers()
  const [{ position }, updateMyPresence] = useMyPresence()

  const onTargetClicked = (position) => {
    console.log(position)
    updateMyPresence({ position: [position[0], 0.5, position[2]] })
  }

  // console.log(others)

  // const { mouse, projected } = useMousePositionY(1)

  // const player = useRef()
  // useFrame(() => {
  //   if (player.current) {
  //     player.current.position.x = projected.current.x
  //     player.current.position.y = 1
  //     player.current.position.z = projected.current.z
  //   }
  // })

  return (
    <>
      <pointLight position={[30, 0, 0]} color="blue" intensity={10} />
      <group position={[-((cellCount / 2) * spacing), 0, -((cellCount / 2) * spacing)]}>
        {cells.map((pos) => (
          <Cell onClick={onTargetClicked} key={`cell-${pos}`} position={pos} />
        ))}
        <SmoothMove position={position}>
          {/* <AnimatedSprite src={lisa} frameCount={9} /> */}
          <AsepriteTest />
        </SmoothMove>
        <GremlinTest animation="idle" position={[6.6, 1, 5.5]} />
        <BardTest animation="idle" position={[1.1, 1, 5.5]} />
        <GremlinTest animation="boom" position={[6.6, 1, 7.7]} />
        {/* <Sprite position={[1.1, 1, 2.2]} img={frog} />
          <Sprite position={[6.6, 1, 5.5]} img={frog} />
          <Sprite position={[0, 1, 5.5]} img={frog} />
          <Sprite position={[6.6, 1, 7.7]} img={frog} />
          <Sprite position={[6.6, 1, 0]} img={frog} /> */}

        {others.map(({ connectionId, presence }) => {
          if (presence == null || presence.position == null) {
            return null
          }

          return (
            <SmoothMove key={`cursor-${connectionId}`} position={presence.position}>
              <Sprite img={frog} />
            </SmoothMove>
          )
        })}
      </group>
    </>
  )
}

const client = createClient({
  publicApiKey: `pk_live_o9Y3NUNDluFE3v5gQCURTlsL`,
})

export default function App() {
  return (
    <Canvas>
      <LiveblocksProvider client={client}>
        <RoomProvider id="123" defaultPresence={() => ({ position: [0, 0.5, 0] })}>
          <color attach="background" args={["black"]} />
          {/* <Sky azimuth={1} inclination={0.1} distance={1000} /> */}
          <OrthographicCamera makeDefault position={[15, 15, 15]} zoom={80} />
          <ambientLight intensity={0.1} />
          <pointLight position={[10, 10, 10]} />
          <Suspense fallback={null}>
            <Room />
          </Suspense>
          <OrbitControls minPolarAngle={Math.PI / 10} maxPolarAngle={Math.PI / 1.5} />
        </RoomProvider>
      </LiveblocksProvider>
    </Canvas>
  )
}
