param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

function Invoke-CheckedGit {
    param([string[]]$GitArguments)
    & git @GitArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git failed. No later commit groups were attempted. Check repository write permissions."
    }
}

Push-Location -LiteralPath $projectRoot
try {
    Invoke-CheckedGit -GitArguments @('rev-parse', '--show-toplevel')
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        throw 'The index already contains staged changes. Commit or unstage those before running this script.'
    }

    $groups = @(
        @{ Message = 'chore: scaffold Expo and Node TypeScript workspaces'; Paths = @(
            '.npmrc', '.prettierignore', '.prettierrc.json', 'tsconfig.base.json', 'compose.yaml', 'package.json', 'package-lock.json',
            'scripts/setup-env.mjs', 'apps/server/package.json', 'apps/server/tsconfig.json', 'apps/server/.env.example', 'apps/server/drizzle.config.ts',
            'apps/mobile/package.json', 'apps/mobile/tsconfig.json', 'apps/mobile/app.json', 'apps/mobile/.env.example',
            'packages/contracts/package.json', 'packages/contracts/tsconfig.json'
        ) },
        @{ Message = 'feat: add shared Zod request and response contracts'; Paths = @('packages/contracts/src') },
        @{ Message = 'feat: add Drizzle schema and PostgreSQL search migration'; Paths = @('apps/server/src/db', 'apps/server/drizzle') },
        @{ Message = 'feat: implement email OTP and revocable sessions'; Paths = @('apps/server/src/config', 'apps/server/src/lib', 'apps/server/src/modules/auth', 'apps/server/src/providers/contracts.ts', 'apps/server/src/providers/email.ts') },
        @{ Message = 'feat: implement owner-scoped nested folders'; Paths = @('apps/server/src/modules/folders') },
        @{ Message = 'feat: add notes tags favorites trash and indexed retrieval'; Paths = @('apps/server/src/modules/library') },
        @{ Message = 'feat: add private Cloudinary files and bounded text extraction'; Paths = @('apps/server/src/modules/files', 'apps/server/src/providers/storage.ts', 'apps/server/src/providers/extraction') },
        @{ Message = 'feat: assemble authenticated API and graceful server lifecycle'; Paths = @('apps/server/src/app.ts', 'apps/server/src/index.ts') },
        @{ Message = 'feat: add Expo design tokens and reusable UI components'; Paths = @('apps/mobile/src/theme', 'apps/mobile/src/components') },
        @{ Message = 'feat: add typed API transport and secure session storage'; Paths = @('apps/mobile/src/lib', 'apps/mobile/src/hooks') },
        @{ Message = 'feat: add email sign-in and isolated sample workspace'; Paths = @('apps/mobile/src/features/auth', 'apps/mobile/src/features/preview') },
        @{ Message = 'feat: add folder management and note editor'; Paths = @('apps/mobile/src/features/folders', 'apps/mobile/src/features/notes') },
        @{ Message = 'feat: connect responsive library search and file management'; Paths = @('apps/mobile/src/features/library', 'apps/mobile/App.tsx', 'apps/mobile/index.ts') },
        @{ Message = 'test: cover authentication ownership search and file lifecycle'; Paths = @('apps/server/test', '.github/workflows') },
        @{ Message = 'docs: document setup API verification and local commit handoff'; Paths = @('README.md', 'docs', 'scripts/commit-work.ps1') }
    )

    foreach ($group in $groups) {
        $existingPaths = @($group.Paths | Where-Object { Test-Path -LiteralPath $_ })
        if ($existingPaths.Count -eq 0) { continue }
        Invoke-CheckedGit -GitArguments (@('add', '--') + $existingPaths)
        & git diff --cached --quiet
        if ($LASTEXITCODE -eq 0) { continue }
        if ($LASTEXITCODE -ne 1) { throw 'Could not inspect staged changes.' }
        Invoke-CheckedGit -GitArguments @('commit', '-m', $group.Message)
    }
    Write-Host 'Local commit groups completed. Nothing was pushed.'
    Invoke-CheckedGit -GitArguments @('log', '-15', '--oneline')
    Invoke-CheckedGit -GitArguments @('status', '--short')
}
finally {
    Pop-Location
}
